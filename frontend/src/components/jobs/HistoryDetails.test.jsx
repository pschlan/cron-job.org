import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import HistoryDetails from './HistoryDetails';
import { JobStatus } from '../../utils/Constants';
import enTranslation from '../../locales/en/translation.json';

// Keep the test focused on the status-explanation behaviour by stubbing the API
// and the unrelated child components.
// NB: a plain function (not jest.fn) because react-scripts runs with
// resetMocks:true, which would otherwise wipe the implementation before each test.
jest.mock('../../utils/API', () => ({
  __esModule: true,
  getJobHistoryDetails: () => Promise.resolve({ jobHistoryDetails: {} }),
}));
jest.mock('./Timing', () => ({ __esModule: true, default: () => null }));
jest.mock('../misc/Code', () => ({ __esModule: true, default: ({ children }) => <div>{children}</div> }));
jest.mock('../misc/Headers', () => ({ __esModule: true, default: () => null }));
jest.mock('../misc/SslCertExpiryIcon', () => ({ __esModule: true, default: () => null }));

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: enTranslation } },
    interpolation: { escapeValue: false },
  });
});

const baseLog = {
  identifier: 'abc',
  date: 1700000000,
  url: 'https://example.com',
  httpStatus: 0,
  statusText: '',
};

function renderDetails(log) {
  const moment = () => ({ calendar: () => 'today' });
  return render(
    <I18nextProvider i18n={i18n}>
      <HistoryDetails log={{ ...baseLog, ...log }} open={true} onClose={() => {}} moment={moment} />
    </I18nextProvider>
  );
}

describe('HistoryDetails status explanation', () => {
  it('shows the dedicated explanation for a 404 HTTP error', async () => {
    renderDetails({ status: JobStatus.FAILED_HTTPERROR, httpStatus: 404, statusText: 'Not Found' });
    await waitFor(() =>
      expect(screen.getByText(/the requested url does not exist/i)).toBeInTheDocument()
    );
  });

  it('shows the 5xx class explanation for an uncommon server error code', async () => {
    renderDetails({ status: JobStatus.FAILED_HTTPERROR, httpStatus: 599, statusText: 'Unknown' });
    await waitFor(() =>
      expect(screen.getByText(/server encountered an error/i)).toBeInTheDocument()
    );
  });

  it('shows the timeout explanation for a non-HTTP failure mode', async () => {
    renderDetails({ status: JobStatus.FAILED_TIMEOUT });
    await waitFor(() =>
      expect(screen.getByText(/did not fully respond within the configured timeout/i)).toBeInTheDocument()
    );
  });

  it('does not show any explanation for a successful execution', async () => {
    renderDetails({ status: JobStatus.OK, httpStatus: 200, statusText: 'OK' });
    // The status itself still renders (await it so the async load settles)...
    await screen.findByText(/200 OK/);
    // ...but no explanatory note should be present.
    expect(screen.queryByText(/check the url/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/server encountered an error/i)).not.toBeInTheDocument();
  });
});
