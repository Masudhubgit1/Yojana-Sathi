// --- 1. CONFIGURATION ---
// Get your key from: https://aistudio.google.com/
const API_KEY = "AIzaSyCaNkzTXtl8geLam4JoNGc7HLS8NcH4Nyg"; // Keep your working key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
let currentLang = "English"; // This is the starting language
let isLoading = false;

// --- 2. SYSTEM PROMPT (Tells Gemini how to behave) ---
function buildSystemPrompt() {
  return `You are Yojana Saathi, a friendly AI assistant. 
  Use this scheme database: ${JSON.stringify(SCHEMES)}.
  
  IMPORTANT: You must respond ONLY in ${currentLang}.
  
  Answer the user's question briefly. If a scheme matches, mention its EXACT name from the database.`;
}

// --- 3. GEMINI API CALL ---
async function callGemini(userText) {
  const systemInstructionText = buildSystemPrompt();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      contents: [{
        role: "user",
        parts: [{ text: userText }]
      }],
      generationConfig: {
          temperature: 0.7
      }
    })
  });

  if (!response.ok) {
     const errData = await response.json();
     console.error("Gemini API Error Details:", errData);
     throw new Error("Gemini API Error: " + (errData.error?.message || response.statusText));
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// --- 4. MESSAGE HANDLING ---
async function sendUserMessage(text) {
  if (isLoading || !text.trim()) return;
  isLoading = true;
  
  addUserMessage(text);
  showTyping();

  try {
    const reply = await callGemini(text);
    removeTyping();

    // Check which schemes the AI is talking about
    const matchedSchemes = SCHEMES.filter(s => 
      reply.toLowerCase().includes(s.name.toLowerCase()) ||
      text.toLowerCase().includes(s.category.toLowerCase())
    );

    if (matchedSchemes.length > 0) {
      addBotMessageWithCards(reply, matchedSchemes);
    } else {
      addBotMessage(reply);
    }
  } catch (err) {
    removeTyping();
    addBotMessage("I'm having trouble connecting to my brain! Please check your API key.");
    console.error(err);
  }

  isLoading = false;
}

// --- 5. UI HELPERS ---
function addBotMessage(text) {
  const msgs = document.getElementById("messages");
  msgs.innerHTML += `<div class="msg bot"><div class="msg-bubble">${text}</div></div>`;
  msgs.scrollTop = msgs.scrollHeight;
}

function addBotMessageWithCards(text, matchedSchemes) {
  const msgs = document.getElementById("messages");
  let cardsHTML = matchedSchemes.map(s => `
    <div class="scheme-card">
      <h4>${s.name}</h4>
      <p>${s.desc}</p>
      <div class="tags">
        <span class="tag tag-green">${s.benefit}</span>
        <span class="tag tag-blue">${s.category}</span>
      </div>
      <button class="apply-btn" onclick="window.open('${s.link}', '_blank')">How to apply →</button>
    </div>
  `).join('');

  msgs.innerHTML += `
    <div class="msg bot">
      <div class="msg-bubble">${text}</div>
      ${cardsHTML}
    </div>`;
  msgs.scrollTop = msgs.scrollHeight;
}

function addUserMessage(text) {
  const msgs = document.getElementById("messages");
  msgs.innerHTML += `<div class="msg user"><div class="msg-bubble">${text}</div></div>`;
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById("messages");
  msgs.innerHTML += `<div class="msg bot" id="typing-indicator"><div class="msg-bubble"><div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div></div>`;
}

function removeTyping() {
  const t = document.getElementById("typing-indicator");
  if (t) t.remove();
}

// --- 6. INITIALIZATION ---
function init() {
  // Send Button Click
  document.getElementById("send-btn").addEventListener("click", () => {
    const input = document.getElementById("user-input");
    sendUserMessage(input.value);
    input.value = "";
  });

  // Enter Key Support
  document.getElementById("user-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("send-btn").click();
  });

  // Sidebar & Chip Clicks
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-tag") || e.target.classList.contains("chip")) {
      sendUserMessage(e.target.textContent);
    }
  });
  // --- PASTE THE VOICE LOGIC HERE (Around Line 145) ---
  const voiceBtn = document.getElementById("voice-btn");
  const userInput = document.getElementById("user-input");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN'; 

      voiceBtn.addEventListener("click", () => {
          recognition.start();
          voiceBtn.classList.add("listening"); // Adds the pulse effect
      });

      recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          userInput.value = transcript;
          voiceBtn.classList.remove("listening");
          sendUserMessage(transcript);
      };

      recognition.onerror = () => {
          voiceBtn.classList.remove("listening");
          console.error("Speech recognition error");
      };
  }
  // --- END OF VOICE LOGIC ---
// --- Language Button Clicks ---
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      // 1. UI: Change active button color
      document.querySelectorAll(".lang-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // 2. Update the language variable (using the text on the button)
      currentLang = btn.textContent;

      // 3. Confirm the switch in the chat
      const greetings = {
        "English": "Switched to English.",
        "हिन्दी": "अब मैं हिन्दी में उत्तर दूँगा।",
        "বাংলা": "এখন থেকে আমি বাংলায় উত্তর দেব।",
        "தமிழ்": "நான் இப்போது தமிழில் பதிலளிப்பேன்.",
        "తెలుగు": "నేను ఇప్పుడు తెలుగులో సమాధానం ఇస్తాను."
      };
      addBotMessage(greetings[currentLang] || `Language switched to ${currentLang}`);
    });
  });
  addBotMessage("Namaste! I am your **Gemini-powered** Yojana Saathi. How can I help you today?");
}

init();
