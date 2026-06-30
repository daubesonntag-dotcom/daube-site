(() => {
  const API_PATH = "/api/v1/quest";
  const HEALTH_PATH = "/api/ecosystem/status";
  const ENDPOINT_KEY = "daube-backend-url";
  const HISTORY_KEY = "daube-chat-history";

  const byId = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const cleanBase = value => String(value || "").trim().replace(/\/$/, "");
  const getBase = () => cleanBase(localStorage.getItem(ENDPOINT_KEY));
  const setBase = value => localStorage.setItem(ENDPOINT_KEY, cleanBase(value));

  function consoleBox() {
    return byId("console") || byId("log");
  }

  function setStatus(text) {
    const live = byId("live") || byId("status");
    if (live) live.textContent = text;
  }

  function setBusy(busy) {
    const orb = byId("orb");
    if (orb) orb.classList.toggle("busy", busy);
    const system = byId("systemState");
    if (system) system.textContent = busy ? "Working" : "Stable";
  }

  function appendConsole(text) {
    const box = consoleBox();
    if (!box) return;
    box.textContent = text;
  }

  function addHistory(role, text) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    history.push({ role, text, at: new Date().toISOString() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40)));
  }

  async function askBackend(message, mode = "chat") {
    const base = getBase();
    if (!base) throw new Error("BACKEND_NOT_CONFIGURED");

    const response = await fetch(base + API_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DAUBE-CLIENT": "android"
      },
      body: JSON.stringify({ message, mode })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || `HTTP_${response.status}`);
    return data;
  }

  async function testBackend(showResult = true) {
    const base = getBase();
    if (!base) {
      if (showResult) appendConsole("Chưa có Backend URL. Mở Settings → Kết nối AI.");
      return false;
    }

    try {
      const response = await fetch(base + HEALTH_PATH, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      const ok = response.ok && data?.ok;
      if (showResult) appendConsole(ok ? `Backend online: ${base}` : `Backend chưa sẵn sàng: ${base}`);
      setStatus(ok ? "● AI ONLINE" : "● LOCAL READY");
      return Boolean(ok);
    } catch {
      if (showResult) appendConsole(`Không kết nối được backend: ${base}`);
      setStatus("● LOCAL READY");
      return false;
    }
  }

  async function submitRealQuest(message, mode = "chat") {
    const text = String(message || "").trim();
    if (!text) return;

    addHistory("user", text);
    setBusy(true);
    setStatus("● GRAND STEWARD THINKING");
    appendConsole(`Founder → ${text}\n\nGrand Steward đang phân tích...`);

    try {
      const data = await askBackend(text, mode);
      const answer = data?.text?.trim() || "Grand Steward chưa trả về nội dung.";
      addHistory("assistant", answer);
      appendConsole(`Founder → ${text}\n\nGrand Steward →\n${answer}`);
      setStatus("● AI ONLINE");
    } catch (error) {
      const code = String(error?.message || error);
      const help = code === "BACKEND_NOT_CONFIGURED"
        ? "Mở Settings → Kết nối AI và nhập HTTPS backend URL."
        : `Backend lỗi: ${code}`;
      appendConsole(`Founder → ${text}\n\n${help}\n\nQuest vẫn được lưu cục bộ.`);
      setStatus("● LOCAL READY");
    } finally {
      setBusy(false);
    }
  }

  function addConnectionControls() {
    const settings = byId("settings");
    const target = settings?.querySelector(".sheet-grid") || settings;
    if (!target || byId("connect-ai")) return;

    const connect = document.createElement("button");
    connect.id = "connect-ai";
    connect.innerHTML = "Kết nối AI<small>Backend HTTPS · OpenAI</small>";
    connect.onclick = async () => {
      const current = getBase();
      const value = prompt("Nhập Backend URL HTTPS của D'AUBE Nexus", current || "");
      if (value === null) return;
      setBase(value);
      await testBackend(true);
    };

    const history = document.createElement("button");
    history.id = "chat-history";
    history.innerHTML = "Lịch sử trò chuyện<small>Lưu cục bộ trên thiết bị</small>";
    history.onclick = () => {
      const items = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      appendConsole(items.length
        ? items.map(item => `${item.role === "user" ? "Founder" : "Grand Steward"}: ${item.text}`).join("\n\n")
        : "Chưa có lịch sử trò chuyện.");
    };

    target.appendChild(connect);
    target.appendChild(history);
  }

  function wireActions() {
    const launch = byId("launch");
    const command = byId("command");
    if (launch && command) {
      launch.onclick = () => submitRealQuest(command.value, "chat");
    }

    const doctor = byId("doctor");
    if (doctor) doctor.onclick = () => submitRealQuest("Doctor scan toàn hệ thống, xác định lỗi và đề xuất cách vá an toàn.", "doctor");

    document.querySelectorAll("[data-quick]").forEach(button => {
      button.onclick = () => {
        const prompts = {
          build: "Lập kế hoạch build app và kiểm tra đầu ra.",
          design: "Tạo phương án UI/UX vàng chanh cao cấp cho D'AUBE Nexus.",
          sync: "Kiểm tra và lập kế hoạch đồng bộ ecosystem web, Android và Windows.",
          deploy: "Chuẩn bị kế hoạch deploy production an toàn.",
          scan: "Quét repo và phân tích tình trạng hệ thống."
        };
        submitRealQuest(prompts[button.dataset.quick] || button.textContent, button.dataset.quick || "chat");
      };
    });

    document.querySelectorAll("[data-tool]").forEach(button => {
      button.onclick = () => submitRealQuest(button.textContent.trim(), "plan");
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    addConnectionControls();
    wireActions();
    await sleep(250);
    await testBackend(false);
  });
})();
