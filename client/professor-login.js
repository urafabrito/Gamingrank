const API = "https://gamingrank-api.onrender.com/api";

const formLogin = document.getElementById("formLogin");
const adminSecretInput = document.getElementById("adminSecret");
const msg = document.getElementById("msg");

function setMsg(text, isError = false) {
  msg.textContent = text || "";
  msg.style.color = isError ? "#b91c1c" : "#475569";
}

function setSecret(v) {
  sessionStorage.setItem("adminSecret", v);
}
function getSecret() {
  return sessionStorage.getItem("adminSecret") || "";
}


if (getSecret()) {
  window.location.href = "./professor.html";
}

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const secret = adminSecretInput.value.trim();
  if (!secret) return;

  setMsg("Validando chave...");

  try {
    const res = await fetch(`${API}/admin/turmas`, {
      headers: { "x-admin-secret": secret },
    });

    if (!res.ok) {
      setMsg("Chave inválida. Tente novamente.", true);
      return;
    }

    
    setSecret(secret);
    window.location.href = "./professor.html";
  } catch (err) {
    setMsg("Erro ao conectar na API.", true);
  }
});