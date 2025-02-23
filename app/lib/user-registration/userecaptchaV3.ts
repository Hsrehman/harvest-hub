import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha?: any;
  }
}

export const loadReCaptchaScript = (siteKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector('#recaptcha-v3-script')) {
      return resolve();
    }
    const script = document.createElement('script');
    script.id = 'recaptcha-v3-script';
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.body.appendChild(script);
  });
};

export const useRecaptchaV3 = (siteKey: string) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadReCaptchaScript(siteKey)
      .then(() => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            setReady(true);
          });
        }
      })
      .catch((error) => {
        console.error('Error loading reCAPTCHA script:', error);
      });
  }, [siteKey]);

  const executeRecaptcha = useCallback(
    (action: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!ready || !window.grecaptcha) {
          return reject(new Error('reCAPTCHA is not ready'));
        }
        window.grecaptcha
          .execute(siteKey, { action })
          .then((token: string) => resolve(token))
          .catch((err: Error) => reject(err));
      });
    },
    [ready, siteKey]
  );

  return { ready, executeRecaptcha };
};