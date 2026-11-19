(function () {
  'use strict';

  function instalar(input) {
    if (input.dataset.passwordToggleListo === '1') {
      return;
    }
    input.dataset.passwordToggleListo = '1';

    var wrap = document.createElement('div');
    wrap.className = 'pwd-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'pwd-toggle';
    boton.textContent = 'Mostrar';
    boton.setAttribute('aria-label', 'Mostrar contraseña');
    boton.setAttribute('aria-pressed', 'false');
    wrap.appendChild(boton);

    boton.addEventListener('click', function () {
      var mostrar = input.type === 'password';
      input.type = mostrar ? 'text' : 'password';
      boton.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      boton.setAttribute('aria-label', (mostrar ? 'Ocultar' : 'Mostrar') + ' contraseña');
      boton.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
      input.focus();
    });
  }

  function iniciar() {
    var campos = document.querySelectorAll('input[type="password"][data-password-toggle]');
    Array.prototype.forEach.call(campos, instalar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
