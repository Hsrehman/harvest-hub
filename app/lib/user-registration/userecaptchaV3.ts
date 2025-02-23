import { useState, useEffect } from 'react';

export function useRecaptchaV3(siteKey: string) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadScript = () => {
      if (!(window as any).grecaptcha) {
        const script = document.createElement('script');
        script.src = `https://www.recaptcha.net/recaptcha/api.js?render=${siteKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => setReady(true);
        document.body.appendChild(script);
      } else {
        setReady(true);
      }
    };

    loadScript();

    return () => {
      const script = document.querySelector(`script[src*="recaptcha/api.js"]`);
      if (script) document.body.removeChild(script);
    };
  }, [siteKey]);

  const executeRecaptcha = async (action: string): Promise<string> => {
    if (!ready) throw new Error('reCAPTCHA not ready');
    return new Promise((resolve, reject) => {
      try {
        const grecaptcha = (window as any).grecaptcha;
        if (!grecaptcha || !grecaptcha.execute) {
          reject(new Error('reCAPTCHA not loaded'));
          return;
        }
        grecaptcha.ready(() => {
          grecaptcha
            .execute(siteKey, { action })
            .then(resolve)
            .catch(reject);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  return { ready, executeRecaptcha };
}