#include "WAFValidator.h"

#include <iostream>
#include <memory>
#include <unordered_set>

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/server/TThreadedServer.h>
#include <thrift/transport/TServerSocket.h>
#include <thrift/transport/TBufferTransports.h>

#include <curl/curl.h>

#include <modsecurity/modsecurity.h>
#include <modsecurity/rules_set.h>
#include <modsecurity/intervention.h>

using namespace ::apache::thrift;
using namespace ::apache::thrift::protocol;
using namespace ::apache::thrift::transport;
using namespace ::apache::thrift::server;

// TODO From config file
const char *RULES_SET_URI = "/etc/crs4/crs.conf";

// TODO Move to file shared with chronos
std::string replaceVariables(const std::string &in)
{
  static const std::string VAR_PREFIX = "%cjo:";

  static const std::unordered_set<std::string> VARIABLES =
  {
    "%cjo:unixtime%",
    "%cjo:uuid4%"
  };

  std::string res = in;
  std::size_t pos = 0;
  while((pos = res.find(VAR_PREFIX, pos)) != std::string::npos)
  {
    bool varMatched = false;

    for(const auto &var : VARIABLES)
    {
      if(res.substr(pos, var.size()) == var)
      {
        std::string repl{};
        res.replace(pos, var.size(), repl);
        pos += repl.size();
        varMatched = true;
        break;
      }
    }

    if(!varMatched)
    {
      pos += VAR_PREFIX.size();
    }
  }

  return res;
}

// TODO Move to file shared with chronos
std::string sanitizeHttpHeaderKey(std::string key)
{
  static const std::unordered_set<char> forbiddenChars = {
    // CTLs
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127,
    // Separators
    '(', ')', '<', '>', '@',
    ',', ';', ':', '\\', '"',
    '/', '[', ']', '?', '=',
    '{', '}', ' '
  };

  key.erase(std::remove_if(key.begin(), key.end(),
      [] (char c) { return forbiddenChars.count(c) != 0;  }),
    key.end());

  return key;
}

// TODO Move to file shared with chronos
std::string sanitizeHttpHeaderValue(std::string value)
{
  static const std::unordered_set<char> forbiddenChars = {
    10, 13
  };

  value.erase(std::remove_if(value.begin(), value.end(),
      [] (char c) { return forbiddenChars.count(c) != 0;  }),
    value.end());

  return value;
}

void addHeader(modsecurity::Transaction &txn, const std::string &key, const std::string &val)
{
  txn.addRequestHeader(reinterpret_cast<const unsigned char *>(key.c_str()),
    key.size(),
    reinterpret_cast<const unsigned char *>(val.c_str()),
    val.size());
}

void modSecurityServerLogCallback(void *arg, const void *msg)
{
  if (arg == nullptr || msg == nullptr)
  {
    return;
  }

  std::string *logs = reinterpret_cast<std::string *>(arg);

  logs->append(reinterpret_cast<const char *>(msg));
  logs->append("\n");
}

struct URLComponents
{
  std::string hostname;
  std::string path;
  std::string query;

  std::string uri() const
  {
    std::string result = path;

    if (!query.empty())
    {
      result += "?";
      result.append(query);
    }

    return result;
  }
};

URLComponents parseURL(const std::string &url)
{
  URLComponents result;

  std::unique_ptr<CURLU, std::function<void(CURLU *)>> h(curl_url(),
    [] (CURLU *h) { if (h) curl_url_cleanup(h); });
  if (h == nullptr)
  {
    throw std::runtime_error("curl_url() failed!");
  }

  int rc = curl_url_set(h.get(), CURLUPART_URL, url.c_str(), 0);
  if (rc != CURLE_OK)
  {
    std::cout << "extractHostname(): curl_url_set(CURLUPART_URL) failed for " << url << std::endl;
    return result;
  }

  char *hostname;
  rc = curl_url_get(h.get(), CURLUPART_HOST, &hostname, 0);
  if (rc == CURLE_OK && hostname != nullptr)
  {
    result.hostname = hostname;
    curl_free(hostname);
  }
  else
  {
    std::cout << "extractHostname(): curl_url_get(CURLUPART_HOST) failed for " << url << std::endl;
  }

  char *path;
  rc = curl_url_get(h.get(), CURLUPART_PATH, &path, 0);
  if (rc == CURLE_OK && path != nullptr)
  {
    result.path = path;
    curl_free(path);
  }

  char *query;
  rc = curl_url_get(h.get(), CURLUPART_QUERY, &query, 0);
  if (rc == CURLE_OK && query != nullptr)
  {
    result.query = query;
    curl_free(query);
  }

  return result;
}

class WAFValidatorHandler : virtual public WAFValidatorIf
{
public:
  WAFValidatorHandler()
    : m_modSec(std::make_unique<modsecurity::ModSecurity>())
    , m_rulesSet(std::make_unique<modsecurity::RulesSet>())
  {
    std::cout << "WAFValidatorHandler::WAFValidatorHandler()" << std::endl;

    m_modSec->setConnectorInformation("cron-job.org WAFValidator v0.0.1");
    m_modSec->setServerLogCb(modSecurityServerLogCallback);

    if (m_rulesSet->loadFromUri(RULES_SET_URI) < 0)
    {
      std::cout << "ERROR: Failed to load rules set from " << RULES_SET_URI << ":"
        << m_rulesSet->m_parserError.str()
        << std::endl;
      throw std::runtime_error("Failed to load libmodsecurity rules!");
    }
  }

  bool ping()
  {
    std::cout << "WAFValidatorHandler::ping()" << std::endl;
    return true;
  }

  void checkJob(WAFValidatorResult &_return, const Job &job)
  {
    std::cout << "WAFValidatorHandler::checkJob()" << std::endl;

    _return.blocked = false;
    _return.status = 200;
    _return.log = {};
    _return.additionalLogs = {};

    std::string logs;

    modsecurity::Transaction txn(m_modSec.get(), m_rulesSet.get(), &logs);

    // Doesn't really matter for our purposes.
    txn.processConnection("127.0.0.1", 12345, "127.0.0.1", 80);

    std::string url = replaceVariables(job.data.url);
    const char *requestMethod;
    switch (job.data.requestMethod)
    {
    case RequestMethod::POST:     requestMethod = "POST";       break;
    case RequestMethod::OPTIONS:  requestMethod = "OPTIONS";    break;
    case RequestMethod::HEAD:     requestMethod = "HEAD";       break;
    case RequestMethod::PUT:      requestMethod = "PUT";        break;
    case RequestMethod::DELETE:   requestMethod = "DELETE";     break;
    case RequestMethod::TRACE:    requestMethod = "TRACE";      break;
    case RequestMethod::CONNECT:  requestMethod = "CONNECT";    break;
    case RequestMethod::PATCH:    requestMethod = "PATCH";      break;
    case RequestMethod::GET:
    default:
      requestMethod = "GET";
      break;
    };

    auto urlComponents = parseURL(url);

    txn.processURI(urlComponents.uri().c_str(), requestMethod, "1.1");

    if (!urlComponents.hostname.empty())
    {
      addHeader(txn, "Host", urlComponents.hostname);
    }

    if (job.__isset.extendedData)
    {
      bool haveContentType = false;

      for (const auto &item : job.extendedData.headers)
      {
        std::string key = sanitizeHttpHeaderKey(item.first);

        if (strcasecmp(key.c_str(), "user-agent") == 0
          || strcasecmp(key.c_str(), "connection") == 0
          || strcasecmp(key.c_str(), "x-forwarded-for") == 0)
        {
          continue;
        }

        if (strcasecmp(key.c_str(), "content-type") == 0)
        {
          haveContentType = true;
        }

        std::string val = sanitizeHttpHeaderValue(replaceVariables(item.second));
        addHeader(txn, key, val);
      }

      if (job.data.requestMethod == RequestMethod::POST
        || job.data.requestMethod == RequestMethod::PUT
        || job.data.requestMethod == RequestMethod::PATCH
        || job.data.requestMethod == RequestMethod::DELETE)
      {
        std::string body = replaceVariables(job.extendedData.body);

        txn.appendRequestBody(reinterpret_cast<const unsigned char *>(body.c_str()),
          body.size());

        addHeader(txn, "Content-Length", std::to_string(body.size()));

        if (!haveContentType)
        {
          addHeader(txn, "Content-Type", "application/x-www-form-urlencoded");
        }
      }
    }

    // TODO From config file
    addHeader(txn, "User-Agent", "Mozilla/4.0 (compatible)");

    // TODO Authentication - if needed at all?

    txn.processRequestHeaders();
    txn.processRequestBody();

    modsecurity::ModSecurityIntervention intervention = { 0 };
    if (txn.intervention(&intervention))
    {
      if (intervention.status >= 400 && intervention.status <= 599)
      {
        _return.blocked = true;
        _return.status = intervention.status;
        _return.log = intervention.log != nullptr ? std::string(intervention.log) : std::string();
        _return.additionalLogs = logs;

        std::cout << "WAFValidatorHandler::checkJob(): Request blocked with status " << _return.status << ": "
          << _return.log << std::endl;
        std::cout << "  "  << _return.additionalLogs << std::endl;
      }
    }

    if (!_return.blocked)
    {
      std::cout << "WAFValidatorHandler::checkJob(): Pass" << std::endl;
    }
  }

private:
  std::unique_ptr<modsecurity::ModSecurity> m_modSec;
  std::unique_ptr<modsecurity::RulesSet> m_rulesSet;
};

int main(int argc, char **argv)
{
  int port = 9092;

  ::std::shared_ptr<WAFValidatorHandler> handler(new WAFValidatorHandler());
  ::std::shared_ptr<TProcessor> processor(new WAFValidatorProcessor(handler));
  // TODO Interface, port from config file
  ::std::shared_ptr<TServerTransport> serverTransport(new TServerSocket(port));
  ::std::shared_ptr<TTransportFactory> transportFactory(new TBufferedTransportFactory());
  ::std::shared_ptr<TProtocolFactory> protocolFactory(new TBinaryProtocolFactory());

  TThreadedServer server(processor, serverTransport, transportFactory, protocolFactory);
  server.serve();

  return 0;
}
