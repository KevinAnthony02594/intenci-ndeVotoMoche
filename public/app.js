document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Zonas (coordenadas reales, Moche / Trujillo, La Libertad) ---------- */
  const zonas = [
    { id:'Moche',   nombre:'Moche',        lat:-8.171237, lng:-79.008996, color:'#c0392b' },
    { id:'Miramar',  nombre:'Miramar',      lat:-8.179299, lng:-78.993800, color:'#e08e45' },
    { id:'Delicias',nombre:'Delicias',        lat:-8.178349, lng:-79.014597, color:'#2e8b57' },
    { id:'Acuario', nombre:'Acuario',       lat:-8.188303, lng:-79.006599, color:'#2c5f8a' },
    { id:'Curva de Sun',   nombre:'Curva de Sun',         lat:-8.151175, lng:-79.013205, color:'#c9a227' },
    { id:'Torres de San Borja', nombre:'Torres de San Borja',lat:-8.167677, lng:-79.024613, color:'#8e44ad' },
    { id:'Campiña', nombre:'Campiña',lat:-8.144521, lng:-78.999499, color:'#44a9ad' },
  ];

  /* ---------- Referencias DOM ---------- */
  const screenMap = document.getElementById('screen-map');
  const screenBallot = document.getElementById('screen-ballot');
  const mainSubtitle = document.getElementById('main-subtitle');
  const legend = document.getElementById('zone-legend');

  const gate = document.getElementById('gate');
  const gateZoneLabel = document.getElementById('gate-zone-label');
  const gateInput = document.getElementById('gate-dni');
  const gateError = document.getElementById('gate-error');
  const gateSubmit = document.getElementById('gate-submit');
  const gateSkip = document.getElementById('gate-skip');
  const gateCancel = document.getElementById('gate-cancel');

  const zonaHidden = document.getElementById('zona');
  const dniHidden = document.getElementById('dni');
  const zoneChip = document.getElementById('zone-chip');
  const voterChip = document.getElementById('voter-chip');

  const form = document.getElementById('vote-form');
  const submitBtn = document.getElementById('submit-btn');
  const messageEl = document.getElementById('message');
  const backToMap = document.getElementById('back-to-map');

  let zonaActual = null;

  /* ---------- Mapa (Leaflet + OpenStreetMap) ---------- */
  const map = L.map('map', { scrollWheelZoom:false }).setView([-8.164267, -79.009903], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap',
    maxZoom:18
  }).addTo(map);

  zonas.forEach(z => {
    const icon = L.divIcon({
      className:'',
      html:`<div class="zone-pin" style="--zc:${z.color}"></div>`,
      iconSize:[26,26], iconAnchor:[13,26]
    });
    const marker = L.marker([z.lat, z.lng], { icon }).addTo(map);
    marker.bindPopup(
      `<strong>${z.nombre}</strong><br><button class="popup-vote-btn" data-zone="${z.id}">Votar en esta zona</button>`
    );
    marker.on('popupopen', () => {
      const btn = document.querySelector(`.popup-vote-btn[data-zone="${z.id}"]`);
      if (btn) btn.addEventListener('click', () => openGate(z));
    });

    const item = document.createElement('div');
    item.className = 'zone-item';
    item.style.setProperty('--zc', z.color);
    item.innerHTML = `<span class="swatch"></span>${z.nombre}`;
    item.addEventListener('click', () => {
      map.setView([z.lat, z.lng], 15);
      marker.openPopup();
      openGate(z);
    });
    legend.appendChild(item);
  });

  /* ---------- Flujo: abrir modal de identificación para una zona ---------- */
  function openGate(zona) {
    zonaActual = zona;
    gateZoneLabel.textContent = zona.nombre;
    gateInput.value = '';
    gateError.textContent = '';
    gate.classList.remove('hidden-gate', 'closing');
  }

  gateCancel.addEventListener('click', () => {
    gate.classList.add('hidden-gate');
  });

  gateInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '');
    gateError.textContent = '';
  });
  gateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') gateSubmit.click(); });

  // Continuar CON DNI: si escribió algo, debe ser válido (8 dígitos)
  gateSubmit.addEventListener('click', () => {
    const val = gateInput.value.trim();
    if (val.length > 0 && !/^\d{8}$/.test(val)) {
      gateError.textContent = 'El DNI debe tener 8 dígitos, o puedes dejarlo en blanco.';
      return;
    }
    entrarABoleta(val.length === 8 ? val : '');
  });

  // Continuar SIN DNI: voto anónimo, siempre permitido
  gateSkip.addEventListener('click', () => {
    entrarABoleta('');
  });

  function entrarABoleta(dniValor) {
    dniHidden.value = dniValor;
    zonaHidden.value = zonaActual.nombre;

    zoneChip.innerHTML = `<span class="dot" style="background:${zonaActual.color}"></span>${zonaActual.nombre}`;
    if (dniValor) {
      voterChip.className = 'chip';
      voterChip.innerHTML = `<span class="dot"></span>DNI •••• ${dniValor.slice(-4)}`;
    } else {
      voterChip.className = 'chip dni-skipped';
      voterChip.innerHTML = `<span class="dot"></span>Voto sin DNI`;
    }

    gate.classList.add('closing');
    setTimeout(() => { gate.classList.add('hidden-gate'); }, 200);

    mainSubtitle.textContent = `Votando en ${zonaActual.nombre}. Selecciona tu candidato y confirma.`;
    screenMap.classList.remove('active');
    screenBallot.classList.add('active');
    form.reset();
    messageEl.classList.add('hidden');
  }

  backToMap.addEventListener('click', () => {
    screenBallot.classList.remove('active');
    screenMap.classList.add('active');
    mainSubtitle.textContent = 'Selecciona tu zona en el mapa para acceder a la boleta de votación.';
    setTimeout(() => map.invalidateSize(), 50);
  });

  /* ---------- Envío del voto ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dni = dniHidden.value.trim(); // puede ir vacío: el DNI es opcional
    const zona = zonaHidden.value;
    const votoInput = form.querySelector(
        'input[name="voto"]:checked'
    );


    if (!votoInput) {

        showMessage(
            'Debe seleccionar un candidato.',
            'error'
        );

        return;

    }


    const candidato_id = votoInput.value;
    const voto = votoInput ? votoInput.value : '';

    if (!voto) {
      showMessage('Debe seleccionar una preferencia de voto.', 'error');
      return;
    }
    if (dni && !/^\d{8}$/.test(dni)) {
      showMessage('Si ingresaste tu DNI, debe tener 8 dígitos.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Registrando...';
    messageEl.classList.add('hidden');

    try {
      const response = await fetch('/api/votar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:JSON.stringify({
            dni:dni||null,
            candidato_id:candidato_id,
            zona
        })
      });
      const data = await response.json();

      if (response.ok) {
        showMessage(data.message, 'success');
        form.querySelectorAll('input[name="candidato"]').forEach(i => i.checked = false);
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Error de conexión. Intente nuevamente.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Registrar voto';
    }
  });

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = type;
    messageEl.classList.remove('hidden');
  }
});

const adminAccess = document.getElementById("admin-access");

if(adminAccess){
    adminAccess.addEventListener("click",()=>{
        adminModal.classList.remove("hidden");
    });
}

const adminModal = document.getElementById("adminModal");

const btnCerrarAdmin = document.getElementById("btnCerrarAdmin");

const btnAdminLogin = document.getElementById("btnAdminLogin");

adminAccess.addEventListener("click", () => {

    adminModal.classList.remove("hidden");

});

btnCerrarAdmin.addEventListener("click",()=>{

    adminModal.classList.add("hidden");

});

btnAdminLogin.addEventListener("click",async()=>{

const dni=

document.getElementById("adminDni").value.trim();

const password=

document.getElementById("adminPassword").value;


const response=

await fetch("/api/admin/login",{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

dni,
password

})

});


const data=

await response.json();


if(!response.ok){

document.getElementById("adminError").innerHTML=

data.message;

return;

}


localStorage.setItem("token",data.token);

localStorage.setItem("nombre",data.nombre);

window.location.href="dashboard.html";

});