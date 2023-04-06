document.addEventListener('DOMContentLoaded', () => {
  const encryptionForm = document.querySelector('[data-id="encryption-form"]');
  const generatedLinkInput = document.querySelector('[data-id="generated-link"]');
  const secretContainer = document.querySelector('[data-id="secret-container"]');
  const messageInput = document.querySelector('[data-id="message"]');
  const passphraseInput = document.querySelector('[data-id="passphrase"]');
  const submitButton = encryptionForm.querySelector('button[type="submit"]');
  const linkDialog = document.querySelector('[data-id="link-dialog"]');
  const closeDialogButton = document.querySelector('[data-id="close-dialog"]');


  encryptionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = messageInput.value;
    const passphrase = passphraseInput.value;

    if (passphrase) {
      
      if (!urlParams.has('encryptedMessage')) {
        const encryptedMessage = await encryptMessage(message, passphrase);
        const link = generateLink(encryptedMessage);
        generatedLinkInput.value = link;
        showDialog(linkDialog); // Show the dialog
      } else {
          decryptMessage(urlParams.get('encryptedMessage'), passphrase).then((decryptedMessage) => {
          messageInput.value = decryptedMessage;
          secretContainer.style.display = 'block';
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

  function generateLink(encryptedMessage) {
    return `https://sendpassword.online/?encryptedMessage=${encodeURIComponent(encryptedMessage)}`;
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('encryptedMessage')) {
    secretContainer.style.display = 'none';
    secretContainer.style.opacity = '0';
    messageInput.readOnly = true;
    submitButton.textContent = 'Decrypt';
  }


  async function encryptMessage(message, passphrase) {
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


  async function decryptMessage(encryptedMessage, passphrase) {
    const [encryptedDataB64, ivB64] = encryptedMessage.split('.');
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
        {once: true}
    );
  }

  closeDialogButton.addEventListener('click', () => {
    closeDialog(linkDialog); // Close the dialog
  });

});
