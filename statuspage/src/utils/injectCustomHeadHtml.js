function appendScriptToHead(oldScript) {
  const script = document.createElement('script');
  Array.from(oldScript.attributes).forEach(attr => {
    script.setAttribute(attr.name, attr.value);
  });
  script.textContent = oldScript.textContent;
  document.head.appendChild(script);
  return script;
}

export default function injectCustomHeadHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();

  const injected = [];

  template.content.querySelectorAll('script').forEach(oldScript => {
    injected.push(appendScriptToHead(oldScript));
    oldScript.remove();
  });

  Array.from(template.content.childNodes).forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
      return;
    }

    const clone = node.cloneNode(true);
    document.head.appendChild(clone);
    injected.push(clone);
  });

  return injected;
}
