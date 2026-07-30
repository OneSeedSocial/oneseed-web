(() => {
  'use strict';

  const config = window.ONESEED_CONFIG ?? {};
  const form = document.querySelector('#waitlist-form');
  const emailInput = document.querySelector('#email');
  const consentInput = document.querySelector('#consent');
  const botInput = document.querySelector('#website');
  const submitButton = document.querySelector('#waitlist-submit');
  const status = document.querySelector('#form-status');

  const revealItems = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.14 },
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  document.querySelectorAll('a[href="#lista-espera"]').forEach((link) => {
    link.addEventListener('click', () => {
      window.setTimeout(() => emailInput?.focus({ preventScroll: true }), 450);
    });
  });

  if (!form || !emailInput || !consentInput || !submitButton || !status) {
    return;
  }

  const endpointReady =
    config.waitlistEnabled === true &&
    typeof config.supabaseUrl === 'string' &&
    config.supabaseUrl.startsWith('https://') &&
    typeof config.supabasePublishableKey === 'string' &&
    config.supabasePublishableKey.length > 20;

  if (!endpointReady) {
    status.textContent = 'La lista de espera se abrirá pronto.';
  }

  const setBusy = (busy) => {
    submitButton.disabled = busy;
    emailInput.disabled = busy;
    consentInput.disabled = busy;
    submitButton.textContent = busy ? 'Plantando…' : 'Plantar mi correo';
  };

  const normalizeProjectUrl = (value) => value.replace(/\/+$/, '');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';

    if (!emailInput.validity.valid) {
      status.textContent = 'Escribe un correo válido.';
      emailInput.focus();
      return;
    }

    if (!consentInput.checked) {
      status.textContent = 'Necesitamos tu permiso para avisarte.';
      consentInput.focus();
      return;
    }

    if (!endpointReady) {
      status.textContent = 'La lista de espera se abrirá pronto.';
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `${normalizeProjectUrl(config.supabaseUrl)}/rest/v1/rpc/join_waitlist`,
        {
          method: 'POST',
          headers: {
            apikey: config.supabasePublishableKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submitted_email: emailInput.value.trim(),
            submitted_source: 'landing',
            submitted_locale: document.documentElement.lang || 'es',
            submitted_consent_version: 'waitlist-es-v1',
            bot_field: botInput?.value ?? '',
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Waitlist request failed: ${response.status}`);
      }

      form.reset();
      status.textContent =
        'Tu semilla queda plantada. Te avisaremos cuando OneSeed esté lista.';
      emailInput.blur();
    } catch (error) {
      console.error(error);
      status.textContent =
        'No hemos podido plantar tu correo. Prueba de nuevo dentro de un momento.';
    } finally {
      setBusy(false);
    }
  });
})();
