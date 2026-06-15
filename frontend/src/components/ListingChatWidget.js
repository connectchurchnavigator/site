/**
 * ListingChatWidget — Real-time interactive chat for ALL listing pages
 * Connected to backend API + WebSocket for live updates
 * Works on: Church, Pastor, Worship Leader, Media Team, Bible College
 *
 * Usage:
 * <ListingChatWidget
 *   entityType="pastor"
 *   entityId="820b40e6-..."
 *   entityName="Rev Bharath Swamy"
 *   entityRole="Senior Pastor"
 *   entityAvatar="https://..."
 *   isOwner={false}         // true = dashboard mode, false = chat mode
 *   currentUserId="user-id" // logged in user id (null if guest)
 * />
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

const API_URL = process.env.REACT_APP_BACKEND_URL || "https://api.churchnavigator.com";
const WS_URL  = (API_URL.replace("https://","wss://").replace("http://","ws://"));

// ─── Entity config ────────────────────────────────────────────────────────────
const CFG = {
  pastor:         { color:"#7c3aed", hasPrayer:true,  chatPH:"Ask the pastor anything...",   prayerPH:"Share your prayer request...",      onlineTxt:"Usually replies within 24h",        pillTxt:"Chat with pastor 👋",        dashTabs:["Messages","Prayers","Visitors"] },
  church:         { color:"#059669", hasPrayer:true,  chatPH:"Ask us about our church...",   prayerPH:"Share a prayer request with us...", onlineTxt:"Mon–Fri 9AM–5PM",                  pillTxt:"Chat with us 👋",            dashTabs:["Messages","Prayers","Visitors"] },
  worship_leader: { color:"#d97706", hasPrayer:false, chatPH:"Ask about bookings...",        onlineTxt:"Available for bookings",           pillTxt:"Chat with worship leader 👋",        dashTabs:["Messages","Enquiries","Visitors"] },
  media_team:     { color:"#1d4ed8", hasPrayer:false, chatPH:"Ask about our services...",    onlineTxt:"Available for bookings",           pillTxt:"Chat with us 👋",                    dashTabs:["Messages","Enquiries","Visitors"] },
  college:        { color:"#0891b2", hasPrayer:false, chatPH:"Ask about programmes...",      onlineTxt:"Admissions Mon–Fri 9AM–5PM",       pillTxt:"Chat with admissions 👋",            dashTabs:["Messages","Enquiries","Visitors"] },
};

const BLOCKED = [/\b(stupid|idiot|hate|damn|hell|bloody)\b/i, /\b(f+u+c+k|sh+i+t|b+i+t+c+h)\b/i];
const BLOCK_MSG = "We kept this one between us 🙏 ChurchNavigator is a place of encouragement and faith. Try sharing something uplifting!";

const greet = (name, entityType) => {
  const h = new Date().getHours();
  const t = h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  const msgs = {
    pastor:         [`${t} and God bless you! 🙏\n\nI'm ${name}, and I'm so glad God brought you here today. You are so welcome — whether searching, struggling or simply curious.\n\nFeel free to ask me anything. My door is always open! ✝️`],
    church:         [`${t}! Welcome to ${name} ⛪\n\nWe're so glad you found us. We're a warm, Spirit-filled community and we'd love for you to join us.\n\nAsk us anything — we're here to help! 🙏`],
    worship_leader: [`${t}! I'm ${name} 🎵\n\nPassionate about leading people into the presence of God. Looking for a worship leader for your church or event? Let's connect! 🙌`],
    media_team:     [`${t}! We're ${name} 🎬\n\nA faith-based media team passionate about capturing moments that matter. Ask us about photography, video or live streaming! 📷`],
    college:        [`${t}! Welcome to ${name} 🎓\n\nWe're here to help you fulfil your calling. Ask us about our programmes, scholarships and how to apply! ✝️`],
  };
  return (msgs[entityType] || msgs.pastor)[0];
};

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  getMessages: (entityType, entityId, conversationId) =>
    fetch(`${API_URL}/api/chat/messages?entity_type=${entityType}&entity_id=${entityId}${conversationId?`&conversation_id=${conversationId}`:""}`).then(r=>r.json()).catch(()=>({messages:[]})),

  sendMessage: (data) =>
    fetch(`${API_URL}/api/chat/messages`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) }).then(r=>r.json()).catch(()=>({})),

  sendPrayer: (data) =>
    fetch(`${API_URL}/api/chat/prayers`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) }).then(r=>r.json()).catch(()=>({})),

  getDashboard: (entityType, entityId) =>
    fetch(`${API_URL}/api/chat/dashboard?entity_type=${entityType}&entity_id=${entityId}`).then(r=>r.json()).catch(()=>({messages:[],prayers:[],visitors:[],unread:0})),

  markRead: (messageId) =>
    fetch(`${API_URL}/api/chat/messages/${messageId}/read`, { method:"PUT" }).catch(()=>{}),

  replyMessage: (messageId, text) =>
    fetch(`${API_URL}/api/chat/messages/${messageId}/reply`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({text}) }).then(r=>r.json()).catch(()=>({})),

  markPrayed: (prayerId) =>
    fetch(`${API_URL}/api/chat/prayers/${prayerId}/prayed`, { method:"PUT" }).catch(()=>{}),
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", bottom:88, left:"50%", transform:"translateX(-50%)", background:"#1a0d3d", color:"#fff", padding:"11px 18px", borderRadius:12, fontSize:12, zIndex:500, maxWidth:290, textAlign:"center", lineHeight:1.6, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", animation:"toastIn 0.3s ease" }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      {msg}
    </div>
  );
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
function Greeting({ cfg, entityName, entityType, entityRole, entityAvatar, onDismiss, onOpenChat }) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [prayer, setPrayer] = useState(false);
  const [prayerTxt, setPrayerTxt] = useState("");
  const [prayerSent, setPrayerSent] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const full = greet(entityName, entityType);
    let i = 0;
    timerRef.current = setInterval(() => {
      if (i < full.length) { setText(full.slice(0,++i)); }
      else { clearInterval(timerRef.current); setDone(true); }
    }, 18);
    return () => clearInterval(timerRef.current);
  }, []);

  const submitPrayer = async () => {
    if (!prayerTxt.trim()) return;
    await api.sendPrayer({ entity_type: entityType, entity_id: null, text: prayerTxt, anonymous: true });
    setPrayerSent(true);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,2,18,0.78)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"flex-end", padding:20, backdropFilter:"blur(4px)" }}
      onClick={e => e.target===e.currentTarget && onDismiss()}>
      <div style={{ width:320, borderRadius:24, overflow:"hidden", boxShadow:`0 24px 80px rgba(0,0,0,0.5),0 0 60px ${cfg.color}30`, animation:"riseUp 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <style>{`@keyframes riseUp{from{transform:translateY(60px) scale(0.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}} @keyframes wv{0%,100%{height:4px;opacity:.4}50%{height:18px;opacity:1}} @keyframes rp0{0%,100%{transform:scale(1);box-shadow:0 0 0 0 ${cfg.color}40}50%{transform:scale(1.08);box-shadow:0 0 20px 4px ${cfg.color}25}} @keyframes rp1{0%,100%{transform:scale(1)}50%{transform:scale(1.05);box-shadow:0 0 15px 3px ${cfg.color}35}} @keyframes rp2{0%,100%{transform:scale(1)}50%{transform:scale(1.02);box-shadow:0 0 10px 2px ${cfg.color}45}}`}</style>

        {/* Header */}
        <div style={{ background:"linear-gradient(160deg,#0d0520,#1a0d3d,#0c1a40)", padding:"20px 18px 14px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%", background:"#4c1d95", top:-80, right:-60, opacity:0.4 }} />
          <button onClick={onDismiss} style={{ position:"absolute", top:12, right:12, zIndex:10, background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"50%", width:28, height:28, color:"rgba(255,255,255,0.5)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>×</button>

          {/* Avatar rings */}
          <div style={{ position:"relative", width:90, height:90, margin:"0 auto 10px" }}>
            {[{inset:-8,anim:"rp0",dur:2},{inset:-4,anim:"rp1",dur:1.8,del:.2},{inset:-1,anim:"rp2",dur:1.6,del:.4}].map((r,i)=>(
              <div key={i} style={{ position:"absolute", inset:r.inset, borderRadius:"50%", border:`${2.5-i*.5}px solid ${cfg.color}`, opacity:!done?1:0.25, animation:!done?`${r.anim} ${r.dur}s ease-in-out infinite ${r.del||0}s`:"none", transition:"opacity .5s" }} />
            ))}
            {entityAvatar
              ? <img src={entityAvatar} alt={entityName} style={{ width:90, height:90, borderRadius:"50%", objectFit:"cover", display:"block", position:"relative", zIndex:3, border:"3px solid rgba(255,255,255,0.2)" }} />
              : <div style={{ width:90, height:90, borderRadius:"50%", background:cfg.color, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", zIndex:3, border:"3px solid rgba(255,255,255,0.2)" }}><i className="ti ti-user" style={{ fontSize:38, color:"#fff" }} /></div>
            }
          </div>

          {/* Waves */}
          <div style={{ display:"flex", gap:3, alignItems:"center", justifyContent:"center", height:20, marginBottom:8 }}>
            {[0,.12,.24,.36,.48].map((d,i)=>(
              <div key={i} style={{ width:3, borderRadius:3, background:cfg.color, animation:!done?`wv .7s ease-in-out infinite ${d}s`:"none", height:!done?undefined:4, opacity:!done?undefined:.3 }} />
            ))}
          </div>

          <div style={{ textAlign:"center", position:"relative", zIndex:2 }}>
            <div style={{ fontSize:15, fontWeight:500, color:"#fff", marginBottom:2 }}>{entityName}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{entityRole}</div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:6, background:"rgba(16,185,129,0.15)", border:"0.5px solid rgba(16,185,129,0.3)", borderRadius:20, padding:"3px 10px" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", animation:!done?"pulse 1.5s ease-in-out infinite":"none" }} />
              <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}`}</style>
              <span style={{ fontSize:10, color:"#6ee7b7" }}>{!done?"Speaking to you now...":"Here for you anytime 🙏"}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"16px 18px", background:"var(--color-background-primary)" }}>
          <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.8, minHeight:80, whiteSpace:"pre-line" }}>
            {text}
            {!done && <span style={{ display:"inline-block", width:2, height:14, background:cfg.color, marginLeft:1, verticalAlign:"text-bottom", animation:"blink .6s step-end infinite" }} />}
            <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
          </div>

          {done && !prayerSent && (
            <>
              <div style={{ display:"flex", gap:8, marginTop:14 }}>
                <button onClick={() => { onDismiss(); onOpenChat(); }} style={{ flex:1, background:cfg.color, color:"#fff", border:"none", borderRadius:12, padding:10, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <i className="ti ti-message" style={{ fontSize:14 }} /> Continue chatting
                </button>
                <button onClick={onDismiss} style={{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-secondary)", color:"var(--color-text-secondary)", borderRadius:12, padding:"10px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Later</button>
              </div>
              {!prayer && cfg.hasPrayer && (
                <div onClick={()=>setPrayer(true)} style={{ marginTop:10, background:"linear-gradient(135deg,#f5f0ff,#ede9fe)", border:"0.5px solid #ddd6fe", borderRadius:12, padding:"11px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                  <span style={{ fontSize:20 }}>🙏</span>
                  <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:500, color:"#4c1d95" }}>Need prayer today?</div><div style={{ fontSize:11, color:"#7c3aed", marginTop:1 }}>Leave a request</div></div>
                  <i className="ti ti-chevron-right" style={{ fontSize:14, color:"#7c3aed" }} />
                </div>
              )}
              {prayer && (
                <div style={{ marginTop:10 }}>
                  <textarea value={prayerTxt} onChange={e=>setPrayerTxt(e.target.value)} placeholder={cfg.prayerPH}
                    style={{ width:"100%", height:70, padding:"8px 12px", fontSize:12, border:`0.5px solid ${cfg.color}`, borderRadius:10, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontFamily:"inherit", outline:"none", resize:"none", boxSizing:"border-box" }} />
                  <button onClick={submitPrayer} style={{ width:"100%", background:cfg.color, color:"#fff", border:"none", borderRadius:10, padding:9, fontSize:12, fontWeight:500, cursor:"pointer", marginTop:6, fontFamily:"inherit" }}>
                    🙏 Send Prayer Request
                  </button>
                </div>
              )}
            </>
          )}
          {prayerSent && (
            <div style={{ marginTop:12, background:"#f0fdf4", border:"0.5px solid #bbf7d0", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontSize:22, marginBottom:6 }}>🙏</div>
              <div style={{ fontSize:13, fontWeight:500, color:"#15803d", marginBottom:4 }}>Prayer request received!</div>
              <div style={{ fontSize:12, color:"#059669" }}>Your request has been sent. You will be prayed for. God bless you! ✝️</div>
              <button onClick={onDismiss} style={{ marginTop:10, background:cfg.color, color:"#fff", border:"none", borderRadius:10, padding:"8px 20px", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>Thank you 🙏</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Box (real-time) ─────────────────────────────────────────────────────
function ChatBox({ cfg, entityType, entityId, entityName, entityRole, entityAvatar, currentUserId, onClose }) {
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [anon, setAnon] = useState(false);
  const [toast, setToast] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const msgsRef = useRef(null);
  const wsRef = useRef(null);

  const scrollBottom = () => { setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 50); };

  // Load messages from API
  useEffect(() => {
    setLoading(true);
    api.getMessages(entityType, entityId, conversationId).then(data => {
      const msgs = data.messages || [];
      if (msgs.length === 0) {
        setMessages([{ id:"welcome", from:"entity", text:`Peace be unto you! 🙏 I'm so glad you're here. How can I help you today? Feel free to ask anything or share what's on your heart.`, time:"Just now", real:false }]);
      } else {
        setMessages(msgs.map(m => ({ id:m.id, from:m.sender_type==="owner"?"entity":"user", text:m.text, time:new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), real:true, read:m.read })));
        if (data.conversation_id) setConversationId(data.conversation_id);
      }
      setLoading(false);
      scrollBottom();
    });
  }, [entityType, entityId, tab]);

  // WebSocket for real-time replies
  useEffect(() => {
    if (!conversationId) return;
    try {
      wsRef.current = new WebSocket(`${WS_URL}/ws/chat/${conversationId}`);
      wsRef.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "new_message") {
          setMessages(m => [...m, { id:data.message.id, from:data.message.sender_type==="owner"?"entity":"user", text:data.message.text, time:new Date(data.message.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), real:true }]);
          scrollBottom();
        }
      };
    } catch(e) {}
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [conversationId]);

  const sendMsg = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (BLOCKED.some(p => p.test(text))) { setToast(BLOCK_MSG); setInput(""); return; }

    setSending(true);
    // Optimistic UI — show message instantly
    const tempId = `temp-${Date.now()}`;
    const newMsg = { id:tempId, from:"user", text, time:"Sending...", sending:true };
    setMessages(m => [...m, newMsg]);
    setInput("");
    scrollBottom();

    const result = await (tab === "chat"
      ? api.sendMessage({ entity_type:entityType, entity_id:entityId, text, sender_id:currentUserId||null, anonymous:!currentUserId, conversation_id:conversationId })
      : api.sendPrayer({ entity_type:entityType, entity_id:entityId, text, anonymous:anon, sender_id:currentUserId||null })
    );

    // Update temp message with real ID
    setMessages(m => m.map(msg => msg.id === tempId ? { ...msg, id:result.id||tempId, time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), sending:false } : msg));
    if (result.conversation_id && !conversationId) setConversationId(result.conversation_id);

    // Auto-reply if no WebSocket (fallback)
    if (!wsRef.current || wsRef.current.readyState !== 1) {
      setTimeout(() => {
        const autoReplies = tab === "chat"
          ? [`Thank you so much for reaching out! 🙏 I will get back to you personally very soon. God bless you!`,`What a blessing to hear from you! ✝️ I read every message personally. God has great things in store for you! 🔥`]
          : [`Thank you for sharing your prayer request. 🙏 I receive this and will lift it before God. You are not alone — God sees you and loves you deeply! ✝️`];
        setMessages(m => [...m, { id:`auto-${Date.now()}`, from:"entity", text:autoReplies[Math.floor(Math.random()*autoReplies.length)], time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}), auto:true }]);
        scrollBottom();
      }, 1800);
    }
    setSending(false);
    scrollBottom();
  }, [input, sending, tab, entityType, entityId, currentUserId, anon, conversationId]);

  const msgs = tab === "chat" ? messages.filter(m => m.type !== "prayer") : messages.filter(m => m.type === "prayer" || m.id === "welcome");
  const displayMsgs = tab === "prayer" && messages.every(m=>m.type!=="prayer") ? [{ id:"p-intro", from:"entity", text:`Share your prayer request below. ${entityName} personally reads every request and prays over them.\n\nYou can choose to stay anonymous.`, time:"" }] : messages;

  return (
    <div style={{ position:"fixed", bottom:100, right:24, zIndex:300, width:320, borderRadius:20, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column", maxHeight:480, animation:"chatUp .4s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <style>{`@keyframes chatUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes rp1{0%,100%{transform:scale(1)}50%{transform:scale(1.05);box-shadow:0 0 15px 3px ${cfg.color}35}}`}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0d0520,#1a0d3d)", padding:"14px 16px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <div style={{ position:"relative", width:42, height:42, flexShrink:0 }}>
          {entityAvatar
            ? <img src={entityAvatar} alt={entityName} style={{ width:42, height:42, borderRadius:"50%", objectFit:"cover", display:"block" }} />
            : <div style={{ width:42, height:42, borderRadius:"50%", background:cfg.color, display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-user" style={{ fontSize:20, color:"#fff" }} /></div>
          }
          <div style={{ position:"absolute", inset:-3, borderRadius:"50%", border:`2px solid ${cfg.color}`, animation:"rp1 2s ease-in-out infinite", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:1, right:1, width:10, height:10, borderRadius:"50%", background:"#10b981", border:"2px solid #0d0520" }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{entityName}</div>
          <div style={{ fontSize:10, color:"#6ee7b7", display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:"#10b981" }} />
            {cfg.onlineTxt}
          </div>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:18, fontFamily:"inherit" }}>×</button>
      </div>

      {/* Tabs — prayer only for pastor + church */}
      <div style={{ display:"flex", background:"var(--color-background-secondary)", borderBottom:"0.5px solid var(--color-border-tertiary)", flexShrink:0 }}>
        {[{k:"chat",l:"💬 Chat"}, ...(cfg.hasPrayer?[{k:"prayer",l:"🙏 Prayer"}]:[])].map(t=>(
          <div key={t.k} onClick={()=>setTab(t.k)} style={{ flex:1, padding:8, fontSize:11, fontWeight:500, cursor:"pointer", textAlign:"center", color:tab===t.k?cfg.color:"var(--color-text-secondary)", borderBottom:`2px solid ${tab===t.k?cfg.color:"transparent"}`, background:tab===t.k?"var(--color-background-primary)":"transparent" }}>
            {t.l}
          </div>
        ))}
      </div>

      {/* Messages */}
      <div ref={msgsRef} style={{ flex:1, overflowY:"auto", padding:12, background:"var(--color-background-primary)", display:"flex", flexDirection:"column", gap:8 }}>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:20 }}>
            <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>Loading messages...</div>
          </div>
        ) : (
          (tab==="chat" ? messages : displayMsgs).map(msg => (
            <div key={msg.id} style={{ maxWidth:"85%", alignSelf:msg.from==="user"?"flex-end":"flex-start" }}>
              {msg.from==="entity" && (
                <div style={{ fontSize:10, color:"var(--color-text-secondary)", marginBottom:3, paddingLeft:4, display:"flex", alignItems:"center", gap:4 }}>
                  {entityAvatar && <img src={entityAvatar} alt="" style={{ width:16, height:16, borderRadius:"50%", objectFit:"cover" }} />}
                  {entityName}
                </div>
              )}
              <div style={{
                padding:"9px 12px", fontSize:12, lineHeight:1.6, whiteSpace:"pre-line",
                borderRadius:msg.from==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px",
                background:msg.from==="user"?cfg.color:tab==="prayer"&&msg.from==="entity"?"linear-gradient(135deg,#fef9ec,#fef3c7)":"var(--color-background-secondary)",
                color:msg.from==="user"?"#fff":tab==="prayer"&&msg.from==="entity"?"#78350f":"var(--color-text-primary)",
                borderLeft:tab==="prayer"&&msg.from==="entity"?`3px solid #d97706`:"none",
                opacity:msg.sending?0.7:1,
              }}>
                {msg.anon && <div style={{ fontSize:10, opacity:.7, marginBottom:2 }}>Anonymous</div>}
                {msg.text}
              </div>
              {msg.time && (
                <div style={{ fontSize:10, color:"var(--color-text-secondary)", marginTop:2, textAlign:msg.from==="user"?"right":"left", paddingLeft:msg.from==="entity"?4:0, paddingRight:msg.from==="user"?4:0 }}>
                  {msg.sending?"Sending...":msg.time}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Anon toggle — only for prayer tab (pastor/church only) */}
      {tab==="prayer" && cfg.hasPrayer && (
        <div style={{ padding:"6px 12px", background:"var(--color-background-secondary)", borderTop:"0.5px solid var(--color-border-tertiary)", flexShrink:0 }}>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"var(--color-text-secondary)", cursor:"pointer" }}>
            <input type="checkbox" checked={anon} onChange={e=>setAnon(e.target.checked)} /> Stay anonymous
          </label>
        </div>
      )}

      {/* Input */}
      <div style={{ display:"flex", gap:8, padding:"10px 12px", background:"var(--color-background-primary)", borderTop:"0.5px solid var(--color-border-tertiary)", flexShrink:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMsg()}
          placeholder={tab==="chat"?cfg.chatPH:cfg.prayerPH}
          style={{ flex:1, padding:"8px 12px", fontSize:12, border:"0.5px solid var(--color-border-secondary)", borderRadius:20, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontFamily:"inherit", outline:"none" }} />
        <button onClick={sendMsg} disabled={sending||!input.trim()} style={{ width:34, height:34, borderRadius:"50%", background:input.trim()?cfg.color:"var(--color-border-secondary)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:input.trim()?"pointer":"default", flexShrink:0, transition:"background .2s" }}>
          <i className="ti ti-send" style={{ fontSize:15, color:"#fff" }} />
        </button>
      </div>

      {toast && <Toast msg={toast} onClose={()=>setToast(null)} />}
    </div>
  );
}

// ─── Dashboard (owner) ────────────────────────────────────────────────────────
function Dashboard({ cfg, entityType, entityId, entityName, entityAvatar, onClose }) {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState({ messages:[], prayers:[], visitors:[], unread:0 });
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [prayedIds, setPrayedIds] = useState([]);
  const wsRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getDashboard(entityType, entityId).then(d => { setData(d); setLoading(false); });
  }, [entityType, entityId]);

  useEffect(() => {
    load();
    // WebSocket for real-time new messages
    try {
      wsRef.current = new WebSocket(`${WS_URL}/ws/dashboard/${entityType}/${entityId}`);
      wsRef.current.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.type === "new_message") setData(prev => ({ ...prev, messages:[d.message,...prev.messages], unread:prev.unread+1 }));
        if (d.type === "new_prayer")  setData(prev => ({ ...prev, prayers:[d.prayer,...prev.prayers] }));
        if (d.type === "new_visitor") setData(prev => ({ ...prev, visitors:[d.visitor,...prev.visitors] }));
      };
    } catch(e) {}
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [load]);

  const sendReply = async (msgId) => {
    if (!replyText.trim()) return;
    await api.replyMessage(msgId, replyText);
    setReplyId(null); setReplyText("");
    load();
  };

  const markPrayed = async (id) => {
    setPrayedIds(ids => [...ids, id]);
    await api.markPrayed(id);
  };

  const tabs = cfg.dashTabs;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(5,2,18,0.72)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
      <div style={{ width:440, maxHeight:"88vh", borderRadius:20, overflow:"hidden", background:"var(--color-background-primary)", boxShadow:"0 24px 80px rgba(0,0,0,0.4)", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0d0520,#1a0d3d)", padding:"16px 18px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", overflow:"hidden", border:"2px solid rgba(255,255,255,0.2)", flexShrink:0 }}>
            {entityAvatar ? <img src={entityAvatar} alt={entityName} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} /> : <div style={{ width:"100%", height:"100%", background:cfg.color, display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-user" style={{ fontSize:20, color:"#fff" }} /></div>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:500, color:"#fff" }}>Messages & Requests</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:1 }}>
              {data.unread > 0 ? `${data.unread} unread` : "All caught up 🙏"} · {data.prayers.filter(p=>!prayedIds.includes(p.id)&&!p.prayed).length} prayer requests pending
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:18, fontFamily:"inherit" }}>×</button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:"var(--color-background-secondary)", borderBottom:"0.5px solid var(--color-border-tertiary)", flexShrink:0 }}>
          {[{ n:data.messages.length, l:"Messages", c:cfg.color },{ n:data.prayers.length, l:"Prayers", c:"#be123c" },{ n:data.unread, l:"Unread", c:"#ef4444" },{ n:data.visitors?.length||0, l:"Visitors", c:"#d97706" }].map((s,i)=>(
            <div key={i} style={{ textAlign:"center", padding:"10px 4px", borderRight:i<3?"0.5px solid var(--color-border-tertiary)":"none" }}>
              <div style={{ fontSize:16, fontWeight:500, color:s.c }}>{s.n}</div>
              <div style={{ fontSize:10, color:"var(--color-text-secondary)", marginTop:1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", background:"var(--color-background-secondary)", borderBottom:"0.5px solid var(--color-border-tertiary)", flexShrink:0 }}>
          {tabs.map((t,i)=>(
            <div key={i} onClick={()=>setTab(i)} style={{ flex:1, padding:"9px 4px", fontSize:11, fontWeight:500, cursor:"pointer", textAlign:"center", color:tab===i?cfg.color:"var(--color-text-secondary)", borderBottom:`2px solid ${tab===i?cfg.color:"transparent"}`, background:tab===i?"var(--color-background-primary)":"transparent" }}>
              {i===0?"💬":i===1&&cfg.hasPrayer?"🙏":"👤"} {t} {i===0&&data.unread>0&&<span style={{ background:"#ef4444", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:10, display:"inline-flex", alignItems:"center", justifyContent:"center", marginLeft:3 }}>{data.unread}</span>}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:12 }}>
          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:30 }}><div style={{ fontSize:13, color:"var(--color-text-secondary)" }}>Loading...</div></div>
          ) : (
            <>
              {tab===0 && (
                data.messages.length === 0
                  ? <div style={{ textAlign:"center", padding:30, color:"var(--color-text-secondary)", fontSize:13 }}>No messages yet 🙏<br/>Messages from visitors will appear here.</div>
                  : data.messages.map(m=>(
                    <div key={m.id} style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                        {m.unread && <div style={{ width:8, height:8, borderRadius:"50%", background:cfg.color, flexShrink:0, marginTop:4 }} />}
                        {!m.unread && <div style={{ width:8, flexShrink:0 }} />}
                        <div style={{ width:34, height:34, borderRadius:"50%", background:"#f5f0ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <i className="ti ti-user" style={{ fontSize:17, color:cfg.color }} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                            <span style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>{m.sender_name||"Visitor"}</span>
                            <span style={{ fontSize:10, padding:"1px 7px", borderRadius:8, background:"#f5f0ff", color:"#5b21b6" }}>{m.source||"Chat"}</span>
                            <span style={{ marginLeft:"auto", fontSize:10, color:"var(--color-text-secondary)" }}>{m.time_ago||"Recently"}</span>
                          </div>
                          <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:8 }}>{m.text}</div>
                          {replyId===m.id ? (
                            <div>
                              <input value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendReply(m.id)} placeholder="Type your reply..." autoFocus
                                style={{ width:"100%", padding:"7px 10px", fontSize:12, border:`0.5px solid ${cfg.color}`, borderRadius:8, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:6 }} />
                              <div style={{ display:"flex", gap:6 }}>
                                <button onClick={()=>sendReply(m.id)} style={{ background:cfg.color, color:"#fff", border:"none", borderRadius:8, padding:"5px 14px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Send Reply</button>
                                <button onClick={()=>setReplyId(null)} style={{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-secondary)", color:"var(--color-text-secondary)", borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>{ setReplyId(m.id); api.markRead(m.id); }} style={{ background:cfg.color, color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Reply</button>
                              <button onClick={()=>api.markRead(m.id)} style={{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-secondary)", color:"var(--color-text-secondary)", borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Mark read</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}

              {tab===1 && (
                data.prayers.length === 0
                  ? <div style={{ textAlign:"center", padding:30, color:"var(--color-text-secondary)", fontSize:13 }}>No prayer requests yet 🙏<br/>Prayer requests from visitors will appear here.</div>
                  : data.prayers.map(p=>(
                    <div key={p.id} style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"12px 14px", marginBottom:8, opacity:(prayedIds.includes(p.id)||p.prayed)?0.65:1 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:(prayedIds.includes(p.id)||p.prayed)?"#10b981":"#be123c", flexShrink:0, marginTop:4 }} />
                        <div style={{ fontSize:22, flexShrink:0 }}>🙏</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                            <span style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>{p.anonymous?"Anonymous":p.sender_name||"Visitor"}</span>
                            {(prayedIds.includes(p.id)||p.prayed) && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:8, background:"#d1fae5", color:"#065f46" }}>Prayed ✓</span>}
                            <span style={{ marginLeft:"auto", fontSize:10, color:"var(--color-text-secondary)" }}>{p.time_ago||"Recently"}</span>
                          </div>
                          <div style={{ fontSize:12, color:"var(--color-text-secondary)", fontStyle:"italic", marginBottom:8 }}>"{p.text}"</div>
                          {!(prayedIds.includes(p.id)||p.prayed) && (
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>markPrayed(p.id)} style={{ background:"linear-gradient(135deg,#d97706,#fbbf24)", color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>🙏 I prayed for this</button>
                              <button style={{ background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-secondary)", color:"var(--color-text-secondary)", borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Reply privately</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}

              {tab===2 && (
                (data.visitors||[]).length === 0
                  ? <div style={{ textAlign:"center", padding:30, color:"var(--color-text-secondary)", fontSize:13 }}>No visitors tracked yet 👤<br/>Profile visitors will appear here.</div>
                  : (data.visitors||[]).map(v=>(
                    <div key={v.id} style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"12px 14px", marginBottom:8, display:"flex", gap:10, alignItems:"center" }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:"#f5f0ff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <i className="ti ti-user" style={{ fontSize:17, color:cfg.color }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:2 }}>{v.name||"Anonymous visitor"}</div>
                        <div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>{v.location||"Unknown location"} · {v.time_ago||"Recently"}</div>
                        <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginTop:1 }}>Spent {v.duration||"??"} · {v.action||"Viewed profile"}</div>
                      </div>
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:v.is_new?"#f5f0ff":"#d1fae5", color:v.is_new?"#5b21b6":"#065f46", flexShrink:0 }}>
                        {v.is_new?"New":"Returning"}
                      </span>
                    </div>
                  ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
function ListingChatWidget({ entityType="pastor", entityId, entityName, entityRole, entityAvatar, isOwner=false, currentUserId=null }) {
  const cfg = CFG[entityType] || CFG.pastor;
  const [showGreeting, setShowGreeting] = useState(false);
  const [showChat,     setShowChat]     = useState(false);
  const [showDash,     setShowDash]     = useState(false);
  const [unread,       setUnread]       = useState(1);

  useEffect(() => {
    if (!isOwner) {
      const t = setTimeout(() => setShowGreeting(true), 2000);
      return () => clearTimeout(t);
    }
  }, [isOwner]);

  return (
    <>
      {showGreeting && !isOwner && (
        <Greeting cfg={cfg} entityType={entityType} entityName={entityName} entityRole={entityRole} entityAvatar={entityAvatar}
          onDismiss={() => setShowGreeting(false)}
          onOpenChat={() => setShowChat(true)} />
      )}
      {showChat && !isOwner && (
        <ChatBox cfg={cfg} entityType={entityType} entityId={entityId} entityName={entityName} entityRole={entityRole} entityAvatar={entityAvatar} currentUserId={currentUserId}
          onClose={() => setShowChat(false)} />
      )}
      {showDash && isOwner && (
        <Dashboard cfg={cfg} entityType={entityType} entityId={entityId} entityName={entityName} entityAvatar={entityAvatar}
          onClose={() => setShowDash(false)} />
      )}

      {/* Floating pill */}
      <div style={{ position:"fixed", bottom:24, right:24, zIndex:200 }}>
        <style>{`@keyframes rp1{0%,100%{transform:scale(1)}50%{transform:scale(1.05);box-shadow:0 0 15px 3px ${cfg.color}35}}`}</style>
        <div onClick={() => { isOwner ? setShowDash(true) : (setShowChat(c=>!c)); setUnread(0); }}
          style={{ display:"flex", alignItems:"center", gap:10, background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:50, padding:"8px 16px 8px 8px", boxShadow:`0 8px 30px ${cfg.color}40`, cursor:"pointer", userSelect:"none" }}>
          <div style={{ position:"relative", width:44, height:44, flexShrink:0 }}>
            {entityAvatar
              ? <img src={entityAvatar} alt={entityName} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", display:"block" }} />
              : <div style={{ width:44, height:44, borderRadius:"50%", background:cfg.color, display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-user" style={{ fontSize:20, color:"#fff" }} /></div>
            }
            <div style={{ position:"absolute", inset:-3, borderRadius:"50%", border:`2px solid ${cfg.color}`, animation:"rp1 2s ease-in-out infinite", pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:1, right:1, width:12, height:12, borderRadius:"50%", background:"#10b981", border:"2px solid var(--color-background-primary)" }} />
            {(isOwner ? 3 : unread) > 0 && (
              <div style={{ position:"absolute", top:-4, right:-4, width:18, height:18, borderRadius:"50%", background:"#ef4444", border:"2px solid var(--color-background-primary)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:500 }}>
                {isOwner ? 3 : unread}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:500, color:"var(--color-text-primary)" }}>{entityName}</div>
            <div style={{ fontSize:11, color:cfg.color }}>{isOwner ? "📊 Messages & requests" : cfg.pillTxt}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ListingChatWidget;
