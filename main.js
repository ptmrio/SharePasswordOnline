document.addEventListener('DOMContentLoaded', () => {
  const encryptionForm = document.querySelector('[data-id="encryption-form"]');
  const generatedLinkTextarea = document.querySelector('[data-id="generated-link"]');
  const secretContainer = document.querySelector('[data-id="secret-container"]');
  const messageInput = document.querySelector('[data-id="message"]');
  const passphraseInput = document.querySelector('[data-id="passphrase"]');
  const revealPassswordButton = document.querySelector('[data-id="reveal-password"]');
  const linkDialog = document.querySelector('[data-id="link-dialog"]');
  const closeDialogButton = document.querySelector('[data-id="close-dialog"]');


  encryptionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = messageInput.value;
    const passphrase = passphraseInput.value;

    // validate the message and passphrase
    encryptionForm.classList.add('validated');
    encryptionForm.reportValidity();

    if (encryptionForm.checkValidity() && passphrase) {

      if (!urlParams.has('encryptedSecret')) {
        const encryptedSecret = await encryptSecret(message, passphrase);
        const link = generateLink(encryptedSecret);
        generatedLinkTextarea.value = link;
        showDialog(linkDialog); // Show the dialog
      } else {
        decryptSecret(urlParams.get('encryptedSecret'), passphrase).then((decryptedMessage) => {
          messageInput.value = decryptedMessage;
          secretContainer.style.display = 'grid';
          setTimeout(() => {
            secretContainer.style.opacity = '1';
            secretContainer.classList.add('shake');
          }, 100);
        }).catch(() => {
          alert('Invalid passphrase or corrupted message.');
        });
      }
    }
  });

  // Encrypt and Decrypt functions remain unchanged

  function generateLink(encryptedSecret) {
    return `https://sharepassword.online/?encryptedSecret=${encodeURIComponent(encryptedSecret)}`;
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('encryptedSecret')) {
    secretContainer.style.display = 'none';
    secretContainer.style.opacity = '0';
    messageInput.readOnly = true;
  }


  async function encryptSecret(message, passphrase) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const passphraseKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new Uint8Array(16), iterations: 10000, hash: 'SHA-256' },
      passphraseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

    return btoa(String.fromCharCode(...new Uint8Array(encryptedData))) + '.' + btoa(String.fromCharCode(...iv));
  }


  async function decryptSecret(encryptedSecret, passphrase) {
    const [encryptedDataB64, ivB64] = encryptedSecret.split('.');
    const encryptedData = Uint8Array.from(atob(encryptedDataB64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));

    const encoder = new TextEncoder();
    const passphraseKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new Uint8Array(16), iterations: 10000, hash: 'SHA-256' },
      passphraseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    try {
      const decryptedData = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedData);
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      throw new Error('Decryption failed.');
    }
  }

  function showDialog(dialog) {
    dialog.showModal();
  }

  function closeDialog(dialog) {
    dialog.setAttribute("closing", "");
    dialog.addEventListener(
      "animationend",
      () => {
        dialog.removeAttribute("closing");
        dialog.close();
      },
      { once: true }
    );
  }

  closeDialogButton.addEventListener('click', () => {
    closeDialog(linkDialog);
  });


  revealPassswordButton.addEventListener('click', () => {
    if (passphraseInput.type === 'password') {
      passphraseInput.type = 'text';
    }
    else {
      passphraseInput.type = 'password';
    }
  });

  (function autohide() {
    const autohideElements = document.querySelectorAll('[data-autohide]');
    autohideElements.forEach((element) => {
      if (urlParams.has('encryptedSecret')) {
        if (element.dataset.autohide === 'hide-on-encrypt') {
          element.classList.remove('display-none');
        }
        else {
          element.classList.add('display-none');
        }
      }
      else {
        if (element.dataset.autohide === 'hide-on-encrypt') {
          element.classList.add('display-none');
        }
        else {
          element.classList.remove('display-none');
        }
      }
    });
  })();


  document.querySelectorAll('[data-class="copy"]').forEach((element) => {
    element.addEventListener('click', () => {
      const tooltipContainer = element.closest('.tooltip-container');

      let clipboardText;
      if (element.dataset.copy) {
        clipboardText = element.dataset.copy;
      }
      else if (element.dataset.copyTarget) {
        const target = document.querySelector(element.dataset.copyTarget);
        if (target.value) {
          target.select();
          target.setSelectionRange(0, target.value.length);
          clipboardText = target.value;
        }
        else if (target.textContent) {
          clipboardText = target.textContent;
        }
        else {
          return;
        }
      }
      else if (element.value) {
        element.select();
        element.setSelectionRange(0, element.value.length);
        clipboardText = element.value;
      }
      else if (element.textContent) {
        clipboardText = element.textContent;
      }
      else {
        return;
      }

      navigator.clipboard.writeText(clipboardText);

      if (tooltipContainer) {
        tooltipContainer.classList.add('active');

        setTimeout(() => {
          tooltipContainer.classList.remove('active');
        }, 2000);
      }

    });
  });



});
