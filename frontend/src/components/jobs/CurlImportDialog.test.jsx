import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import CurlImportDialog from './CurlImportDialog';
import { RequestMethod } from '../../utils/Constants';

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          common: { cancel: 'Cancel' },
          jobs: {
            curlImport: {
              title: 'Import from cURL',
              help: 'Paste a cURL command.',
              command: 'cURL command',
              import: 'Import',
              parseError: 'Could not parse cURL.',
              unsupportedMethod: 'Unsupported method: {{method}}.',
            },
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
});

function renderDialog(props = {}) {
  const onClose = jest.fn();
  const onImport = jest.fn();
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <CurlImportDialog open={true} onClose={onClose} onImport={onImport} {...props} />
    </I18nextProvider>
  );
  return { onClose, onImport, ...utils };
}

function typeCommand(value) {
  const textarea = screen.getByPlaceholderText(/^curl /);
  fireEvent.change(textarea, { target: { value } });
}

describe('CurlImportDialog', () => {
  it('renders the help text and disables the import button while empty', () => {
    renderDialog();
    expect(screen.getByText('Paste a cURL command.')).toBeInTheDocument();
    const importBtn = screen.getByRole('button', { name: 'Import' });
    expect(importBtn).toBeDisabled();
  });

  it('parses a valid cURL command and forwards the structured payload to onImport', () => {
    const { onImport } = renderDialog();
    typeCommand("curl -X POST 'https://example.com/api' -H 'Accept: application/json' -d 'name=ada'");
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(onImport).toHaveBeenCalledTimes(1);
    const payload = onImport.mock.calls[0][0];
    expect(payload.url).toBe('https://example.com/api');
    expect(payload.method).toBe(RequestMethod.POST);
    expect(payload.body).toBe('name=ada');
    expect(payload.headers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'Accept', value: 'application/json' }),
    ]));
  });

  it('passes auth and a null method when none is specified', () => {
    const { onImport } = renderDialog();
    typeCommand("curl -u alice:secret 'https://example.com/'");
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(onImport).toHaveBeenCalledTimes(1);
    const payload = onImport.mock.calls[0][0];
    expect(payload.method).toBeNull();
    expect(payload.auth).toEqual({ user: 'alice', password: 'secret' });
  });

  it('shows an error and does not call onImport when the command cannot be parsed', () => {
    const { onImport } = renderDialog();
    typeCommand('not a curl command');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByText('Could not parse cURL.')).toBeInTheDocument();
  });

  it('shows an unsupported-method error for an unknown HTTP method', () => {
    const { onImport } = renderDialog();
    typeCommand("curl -X NOSUCH 'https://example.com/'");
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.getByText(/Unsupported method: NOSUCH/)).toBeInTheDocument();
  });

  it('clears the error when the user edits the command after a failure', () => {
    renderDialog();
    typeCommand('not a curl command');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByText('Could not parse cURL.')).toBeInTheDocument();

    typeCommand('curl https://example.com');
    expect(screen.queryByText('Could not parse cURL.')).not.toBeInTheDocument();
  });

  it('cancel button calls onClose without invoking onImport', () => {
    const { onClose, onImport } = renderDialog();
    typeCommand('curl https://example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onImport).not.toHaveBeenCalled();
  });
});
