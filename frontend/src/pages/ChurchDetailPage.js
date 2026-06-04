/* eslint-disable */
import React from "react";

import ListingChatWidget from "../components/ListingChatWidget";

// Load Tabler Icons if not already loaded
if (typeof document !== "undefined" && !document.getElementById("tabler-icons-css")) {
  const link = document.createElement("link");
  link.id = "tabler-icons-css";
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
  document.head.appendChild(link);
}

const API_URL = process.env.REACT_APP_BACKEND_URL || "https://api.churchnavigator.com";

// Centered container — like Airbnb/Stripe
const container = { maxWidth:1280, margin:"0 auto", padding:"0 32px", boxSizing:"border-box", width:"100%" };

// ── Helpers ──────────────────────────────────────────────────────────────────
const fixUrl = (url) => {
  if (!url || url === "#") return null;
  return url.startsWith("http") ? url : `https://${url}`;
};

// ── Section Card ─────────────────────────────────────────────────────────────
function SCard({ icon, iconBg, iconColor, hdrBg, title, children, action }) {
  return (
    <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:hdrBg, borderBottom:"0.5px solid #e5e7eb" }}>
        <div style={{ width:28, height:28, borderRadius:7, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className={`ti ti-${icon}`} style={{ fontSize:15, color:iconColor }} />
        </div>
        <span style={{ fontSize:13, fontWeight:500, color:iconColor }}>{title}</span>
        {action && <div style={{ marginLeft:"auto" }}>{action}</div>}
      </div>
      <div style={{ padding:"12px 14px" }}>{children}</div>
    </div>
  );
}

const Tag = ({ label, bg, color, border }) => (
  <span style={{ display:"inline-flex", fontSize:11, padding:"4px 9px", borderRadius:10, margin:2, background:bg, color, border:`0.5px solid ${border}` }}>{label}</span>
);

// ── Branches Tab ──────────────────────────────────────────────────────────────
function BranchesTab({ branches, mainChurch }) {
  const [branchData, setBranchData] = React.useState([]);
  const gradients = ["linear-gradient(135deg,#c4b5fd,#7c3aed)","linear-gradient(135deg,#5DCAA5,#0F6E56)","linear-gradient(135deg,#FAC775,#BA7517)"];
  const colors = ["#7c3aed","#0f766e","#ca8a04"];
  const labels = ["Main Branch","East London","North London","South London","West London"];

  React.useEffect(() => {
    if (!branches?.length) return;
    Promise.all(branches.slice(0,5).map(id =>
      fetch(`${API_URL}/api/churches/${id}`).then(r=>r.json()).catch(()=>({ id, name:"Branch Church", city:mainChurch.city||"London" }))
    )).then(data => setBranchData(data.filter(d=>d&&!d.detail)));
  }, [branches]);

  if (!branches?.length) return (
    <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, padding:30, textAlign:"center", color:"#6b7280", fontSize:13 }}>No branches listed for this church yet.</div>
  );

  const display = branchData.length > 0 ? branchData : branches.slice(0,5).map((id,i)=>({ id, name:`Branch — ${labels[i+1]||"Location"}`, city:mainChurch.city||"London", slug:id }));

  const BranchCard = ({ branch, idx, isMain }) => (
    <div style={{ borderRadius:12, overflow:"hidden", marginBottom:10, border:"0.5px solid #e5e7eb", cursor:isMain?"default":"pointer" }}
      onClick={() => !isMain && branch.slug && (window.location.href=`/church/${branch.slug}`)}>
      <div style={{ height:100, position:"relative", display:"flex", alignItems:"center", justifyContent:"center", background:gradients[idx%gradients.length] }}>
        {isMain && branch.logo && (
          <div style={{ position:"absolute", top:8, left:10, width:36, height:36, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.8)", overflow:"hidden", background:"#fff", zIndex:3 }}>
            <img src={branch.logo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", zIndex:2 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", border:"3px solid rgba(255,255,255,0.8)" }}>
            <i className="ti ti-building-church" style={{ fontSize:18, color:colors[idx%colors.length] }} />
          </div>
          <div style={{ width:3, height:12, background:"rgba(255,255,255,0.8)", borderRadius:2, marginTop:2 }} />
          <div style={{ width:8, height:8, borderRadius:"50%", background:"rgba(255,255,255,0.5)" }} />
        </div>
        <span style={{ position:"absolute", top:10, right:10, fontSize:10, fontWeight:500, padding:"2px 8px", borderRadius:8, background:"rgba(255,255,255,0.25)", color:"#fff", border:"0.5px solid rgba(255,255,255,0.3)" }}>
          {isMain ? "Main Branch" : labels[idx]||`Branch ${idx+1}`}
        </span>
      </div>
      <div style={{ padding:"10px 13px", background:"#fff" }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#111", marginBottom:5 }}>{branch.name}</div>
        {branch.address_line1 && <div style={{ fontSize:11, color:"#6b7280", display:"flex", alignItems:"center", gap:3, marginBottom:3 }}><i className="ti ti-map-pin" style={{ fontSize:12, color:colors[idx%colors.length] }} /> {branch.address_line1}</div>}
        {!branch.address_line1 && branch.city && <div style={{ fontSize:11, color:"#6b7280", display:"flex", alignItems:"center", gap:3, marginBottom:3 }}><i className="ti ti-map-pin" style={{ fontSize:12, color:colors[idx%colors.length] }} /> {branch.city}, UK</div>}
        {branch.services?.[0] && <div style={{ fontSize:11, color:"#6b7280", display:"flex", alignItems:"center", gap:3, marginBottom:3 }}><i className="ti ti-clock" style={{ fontSize:12, color:"#059669" }} /> {branch.services[0].day} {branch.services[0].start_time}{branch.services[0].end_time?` — ${branch.services[0].end_time}`:""}</div>}
        <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:7 }}>
          <span style={{ fontSize:10, padding:"2px 7px", borderRadius:7, background:"#d1fae5", color:"#065f46" }}>{isMain?"Open Sunday":"Active"}</span>
          {(branch.google_maps_link||mainChurch.google_maps_link) && (
            <a href={branch.google_maps_link||mainChurch.google_maps_link} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
              style={{ marginLeft:"auto", background:colors[idx%colors.length], color:"#fff", border:"none", borderRadius:7, padding:"5px 10px", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4, textDecoration:"none" }}>
              <i className="ti ti-navigation" style={{ fontSize:12 }} /> Directions
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <SCard icon="building-community" iconBg="#ede9fe" iconColor="#7c3aed" hdrBg="#faf5ff" title="Church Branches"
      action={<span style={{ fontSize:11, color:"#6b7280" }}>{branches.length} active branches</span>}>
      <BranchCard branch={mainChurch} idx={0} isMain={true} />
      {display.map((branch,i) => <BranchCard key={branch.id||i} branch={branch} idx={i+1} isMain={false} />)}
    </SCard>
  );
}

// ── Nearby Churches ───────────────────────────────────────────────────────────
function NearbyChurches({ currentSlug, city }) {
  const [churches, setChurches] = React.useState([]);
  React.useEffect(() => {
    // Fetch same city first, fallback to general list
    const cityParam = city ? `&city=${encodeURIComponent(city)}` : "";
    fetch(`${API_URL}/api/churches?limit=20${cityParam}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        const filtered = list.filter(c => c.slug !== currentSlug && c.status === "published");
        // Sort: featured first, then recommended, then others
        const sorted = [
          ...filtered.filter(c => c.is_featured),
          ...filtered.filter(c => c.is_recommended && !c.is_featured),
          ...filtered.filter(c => !c.is_featured && !c.is_recommended),
        ];
        // If not enough from city, fetch more
        if (sorted.length >= 3) {
          setChurches(sorted.slice(0, 3));
        } else {
          fetch(`${API_URL}/api/churches?limit=20`)
            .then(r => r.json())
            .then(data2 => {
              const list2 = Array.isArray(data2.data) ? data2.data : Array.isArray(data2) ? data2 : [];
              const filtered2 = list2.filter(c => c.slug !== currentSlug && !sorted.find(s => s.id === c.id));
              setChurches([...sorted, ...filtered2].slice(0, 3));
            }).catch(() => setChurches(sorted.slice(0, 3)));
        }
      })
      .catch(() => {});
  },[currentSlug, city]);
  if (!churches.length) return null;
  return (
    <div style={{ ...container, marginBottom:14 }}><div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"13px 16px 11px", display:"flex", alignItems:"center", gap:10, background:"#faf5ff", borderBottom:"0.5px solid #ede9fe" }}>
        <div style={{ width:28, height:28, borderRadius:7, background:"#ede9fe", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className="ti ti-building-church" style={{ fontSize:15, color:"#7c3aed" }} />
        </div>
        <span style={{ fontSize:13, fontWeight:500, color:"#5b21b6" }}>
          {city ? `Other Churches in ${city}` : "You might also like"}
        </span>
        <a href="/explore" style={{ marginLeft:"auto", fontSize:12, color:"#7c3aed", textDecoration:"none", display:"flex", alignItems:"center", gap:3, fontWeight:500 }}>
          See all churches <i className="ti ti-arrow-right" style={{ fontSize:13 }} />
        </a>
      </div>

      {/* Church cards */}
      <div style={{ padding:"14px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {churches.map((c,i) => (
          <a key={c.id} href={`/church/${c.slug}`} style={{ textDecoration:"none", display:"block", borderRadius:12, overflow:"hidden", border:"0.5px solid #e5e7eb", background:"#fff", transition:"box-shadow .2s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(124,58,237,0.15)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>

            {/* Cover image with overlay */}
            <div style={{ position:"relative", height:100, overflow:"hidden" }}>
              {c.cover_image
                ? <img src={c.cover_image} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy" />
                : <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg,${["#7c3aed,#a78bfa","#059669,#34d399","#1d4ed8,#60a5fa"][i%3]})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <i className="ti ti-building-church" style={{ fontSize:32, color:"rgba(255,255,255,0.8)" }} />
                  </div>
              }
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0) 60%)" }} />

              {/* Logo */}
              {c.logo && (
                <div style={{ position:"absolute", bottom:8, left:10, width:28, height:28, borderRadius:"50%", overflow:"hidden", border:"2px solid rgba(255,255,255,0.8)", background:"#fff" }}>
                  <img src={c.logo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                </div>
              )}

              {/* Featured badge */}
              {c.is_featured && (
                <span style={{ position:"absolute", top:8, right:8, fontSize:9, fontWeight:500, padding:"2px 7px", borderRadius:8, background:"rgba(124,58,237,0.85)", color:"#fff" }}>
                  ⭐ Featured
                </span>
              )}
            </div>

            {/* Info */}
            <div style={{ padding:"10px 12px" }}>
              <div style={{ fontSize:13, fontWeight:500, color:"#111", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>{c.name}</div>

              {/* Location */}
              {(c.city || c.address_line1) && (
                <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#6b7280", marginBottom:4 }}>
                  <i className="ti ti-map-pin" style={{ fontSize:11, color:"#7c3aed", flexShrink:0 }} />
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.city || c.address_line1}</span>
                </div>
              )}

              {/* Denomination */}
              {c.denomination && (
                <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#6b7280", marginBottom:8 }}>
                  <i className="ti ti-building-church" style={{ fontSize:11, color:"#6b7280", flexShrink:0 }} />
                  <span>{c.denomination}</span>
                </div>
              )}

              {/* Service time if available */}
              {c.services?.[0] && (
                <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#7c3aed", background:"#f5f0ff", padding:"3px 8px", borderRadius:7, marginBottom:8, width:"fit-content" }}>
                  <i className="ti ti-clock" style={{ fontSize:10 }} />
                  {c.services[0].day} {c.services[0].start_time}
                </div>
              )}

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color:"#059669", background:"#d1fae5", padding:"2px 7px", borderRadius:6 }}>Open Sunday</span>
                <span style={{ fontSize:11, color:"#7c3aed", display:"flex", alignItems:"center", gap:2 }}>
                  View <i className="ti ti-arrow-right" style={{ fontSize:11 }} />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChurchDetailPage() {
  const [church, setChurch] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("profile");
  const [showCoverPanel, setShowCoverPanel] = React.useState(false);
  const [coverMode, setCoverMode] = React.useState("image");
  const [ytUrl, setYtUrl] = React.useState("");
  const contactRef = React.useRef(null);

  React.useEffect(() => {
    const slug = window.location.pathname.split("/church/")[1]?.split("/")[0];
    if (!slug) { setLoading(false); return; }
    fetch(`${API_URL}/api/churches/${slug}`)
      .then(r=>r.json())
      .then(data=>{ setChurch(data); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ textAlign:"center" }}>
        <i className="ti ti-building-church" style={{ fontSize:48, color:"#7c3aed", display:"block", marginBottom:12 }} />
        <div style={{ fontSize:14, color:"#6b7280" }}>Loading church...</div>
      </div>
    </div>
  );

  if (!church) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ fontSize:14, color:"#6b7280" }}>Church not found</div>
    </div>
  );

  const name = church.name||"Church";
  const description = church.description||"";
  const cover_image = church.cover_image||"";
  const logo = church.logo||"";
  const address = church.address_line1||"";
  const city = church.city||"";
  const phone = church.phone||"";
  const email = church.email||"";
  const denomination = church.denomination||"";
  const ministries = Array.isArray(church.ministries)?church.ministries:[];
  const worship_styles = Array.isArray(church.worship_styles)?church.worship_styles:[];
  const languages = Array.isArray(church.languages)?church.languages:[];
  const facilities = Array.isArray(church.facilities)?church.facilities:[];
  const services = Array.isArray(church.services)?church.services:[];
  const gallery_images = Array.isArray(church.gallery_images)?church.gallery_images:[];
  const google_maps_link = church.google_maps_link||"";
  const facebook = fixUrl(church.facebook);
  const instagram = fixUrl(church.instagram);
  const youtube = fixUrl(church.youtube);
  const twitter = fixUrl(church.twitter);
  const pastor_name = church.pastor_name||"";
  const pastor_id = church.pastor_id||"";
  const other_branches = Array.isArray(church.other_branches)?church.other_branches:[];
  const worship_team = church.worship_team||{};
  const it_media_team = church.it_media_team||{};
  const outreach_team = church.outreach_team||{};
  const video_url = fixUrl(church.video_url)||youtube;
  const slug = church.slug||"";
  const lat = church.latitude;
  const lng = church.longitude;

  const socials = [
    { icon:"brand-facebook", bg:"linear-gradient(135deg,#1877f2,#42a5f5)", href:facebook },
    { icon:"brand-instagram", bg:"linear-gradient(135deg,#833ab4,#e1306c)", href:instagram },
    { icon:"brand-youtube", bg:"linear-gradient(135deg,#ff0000,#cc0000)", href:youtube },
    { icon:"brand-twitter", bg:"linear-gradient(135deg,#111,#333)", href:twitter },
    { icon:"brand-whatsapp", bg:"linear-gradient(135deg,#25d366,#128c7e)", href:phone?`https://wa.me/${phone.replace(/\D/g,"")}`:null },
  ].filter(s=>s.href);

  return (
    <div style={{ background:"#f9fafb", minHeight:"100vh" }}>


      {/* ── HERO ── */}
      <div style={{ position:"relative", height:340, overflow:"hidden", background:"#1a0d3d" }}>
        {cover_image && <img src={cover_image} alt={name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />}
        <div style={{ position:"absolute", width:420, height:420, borderRadius:"50%", background:"#4c1d95", top:-120, right:-60, opacity:0.35 }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(10,5,30,0.93) 0%,rgba(10,5,30,0.1) 75%)" }} />

        {/* Top left badges */}
        <div style={{ position:"absolute", top:14, left:16, display:"flex", gap:7, flexWrap:"wrap", zIndex:2 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:10, background:"rgba(16,185,129,0.2)", color:"#6ee7b7", border:"0.5px solid rgba(16,185,129,0.35)" }}>
            <i className="ti ti-circle-check" style={{ fontSize:11 }} /> Open Sunday
          </span>
          {other_branches.length>0 && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:10, background:"rgba(139,92,246,0.25)", color:"#c4b5fd", border:"0.5px solid rgba(139,92,246,0.4)" }}>
              <i className="ti ti-building-community" style={{ fontSize:11 }} /> {other_branches.length} Branches
            </span>
          )}
        </div>

        {/* Top right buttons */}
        <div style={{ position:"absolute", top:14, right:16, display:"flex", gap:7, zIndex:5 }}>
          {["Save","Share","Claim"].map((btn,i) => (
            <button key={btn} style={{ background:"rgba(255,255,255,0.15)", border:"0.5px solid rgba(255,255,255,0.3)", borderRadius:18, padding:"5px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
              <i className={`ti ti-${["bookmark","share","shield-check"][i]}`} style={{ fontSize:13 }} /> {btn}
            </button>
          ))}
          {/* Edit Cover button */}
          <button onClick={()=>setShowCoverPanel(!showCoverPanel)} style={{ background:"rgba(124,58,237,0.4)", border:"0.5px solid rgba(139,92,246,0.5)", borderRadius:18, padding:"5px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
            <i className="ti ti-photo-edit" style={{ fontSize:13 }} /> Change Cover
          </button>
        </div>

        {/* Cover panel */}
        {showCoverPanel && (
          <div style={{ position:"absolute", top:50, right:14, zIndex:20, background:"rgba(10,5,30,0.96)", border:"0.5px solid rgba(255,255,255,0.12)", borderRadius:12, padding:16, width:240 }}>
            <div style={{ fontSize:12, fontWeight:500, color:"#fff", marginBottom:10 }}>Choose cover type</div>
            {[{k:"image",icon:"photo",l:"Image",sub:"Upload or paste URL"},{k:"youtube",icon:"brand-youtube",l:"YouTube video",sub:"Autoplays silently"}].map(opt=>(
              <div key={opt.k} onClick={()=>setCoverMode(opt.k)} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 10px", borderRadius:8, cursor:"pointer", marginBottom:5, border:`0.5px solid ${coverMode===opt.k?"rgba(139,92,246,0.4)":"rgba(255,255,255,0.08)"}`, background:coverMode===opt.k?"rgba(124,58,237,0.25)":"transparent" }}>
                <i className={`ti ti-${opt.icon}`} style={{ fontSize:16, color:coverMode===opt.k?"#c4b5fd":"rgba(255,255,255,0.6)" }} />
                <div><div style={{ fontSize:12, color:"#fff", fontWeight:500 }}>{opt.l}</div><div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>{opt.sub}</div></div>
                {coverMode===opt.k && <i className="ti ti-check" style={{ fontSize:14, color:"#a78bfa", marginLeft:"auto" }} />}
              </div>
            ))}
            {coverMode==="youtube" && (
              <div>
                <input value={ytUrl} onChange={e=>setYtUrl(e.target.value)} placeholder="Paste YouTube URL..." style={{ width:"100%", padding:"8px 10px", fontSize:12, border:"0.5px solid rgba(255,255,255,0.15)", borderRadius:7, background:"rgba(255,255,255,0.07)", color:"#fff", fontFamily:"inherit", outline:"none", marginTop:8, boxSizing:"border-box" }} />
                <button style={{ width:"100%", background:"#dc2626", color:"#fff", border:"none", borderRadius:7, padding:8, fontSize:12, fontWeight:500, cursor:"pointer", marginTop:6, fontFamily:"inherit" }}>
                  <i className="ti ti-brand-youtube" style={{ fontSize:13 }} /> Play as Cover
                </button>
              </div>
            )}
            {coverMode==="image" && (
              <div>
                <input placeholder="Paste image URL..." style={{ width:"100%", padding:"8px 10px", fontSize:12, border:"0.5px solid rgba(255,255,255,0.15)", borderRadius:7, background:"rgba(255,255,255,0.07)", color:"#fff", fontFamily:"inherit", outline:"none", marginTop:8, boxSizing:"border-box" }} />
                <button style={{ width:"100%", background:"#7c3aed", color:"#fff", border:"none", borderRadius:7, padding:8, fontSize:12, fontWeight:500, cursor:"pointer", marginTop:6, fontFamily:"inherit" }}>Apply Image</button>
              </div>
            )}
          </div>
        )}

        {/* Hero bottom */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"16px 20px", zIndex:2 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:54, height:54, borderRadius:"50%", border:"2.5px solid rgba(255,255,255,0.25)", overflow:"hidden", flexShrink:0, background:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {logo ? <img src={logo} alt={name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} /> : <i className="ti ti-building-church" style={{ fontSize:24, color:"#fff" }} />}
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:500, color:"#fff" }}>{name}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", marginTop:3, display:"flex", alignItems:"center", gap:4 }}>
                {address && <><i className="ti ti-map-pin" style={{ fontSize:12 }} /> {address}</>}
                {denomination && <>&nbsp;·&nbsp;{denomination}</>}
              </div>
            </div>
          </div>
          {/* Action buttons */}
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            {google_maps_link && (
              <a href={google_maps_link} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, background:"#7c3aed", color:"#fff", textDecoration:"none", whiteSpace:"nowrap" }}>
                <i className="ti ti-navigation" style={{ fontSize:14 }} /> Get Directions
              </a>
            )}
            <a href={`/church/${slug}/visit`} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, color:"#fff", background:"rgba(16,185,129,0.3)", border:"1px solid rgba(16,185,129,0.5)", textDecoration:"none", whiteSpace:"nowrap" }}>
              <i className="ti ti-qrcode" style={{ fontSize:14 }} /> Check In
            </a>
            {phone && (
              <a href={`tel:${phone}`} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.35)", textDecoration:"none", whiteSpace:"nowrap" }}>
                <i className="ti ti-phone" style={{ fontSize:14 }} /> Call
              </a>
            )}
            {/* Contact Us — scrolls to bottom */}
            <button onClick={()=>contactRef.current?.scrollIntoView({behavior:"smooth"})} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.35)", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              <i className="ti ti-message" style={{ fontSize:14 }} /> Contact Us
            </button>
            {/* Watch Live */}
            {video_url && (
              <a href={video_url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.35)", textDecoration:"none", whiteSpace:"nowrap" }}>
                <i className="ti ti-brand-youtube" style={{ fontSize:14 }} /> Watch Live
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", background:"#fff", borderBottom:"0.5px solid #e5e7eb" }}>
        {[{n:ministries.length,l:"Ministries",c:"#7c3aed"},{n:worship_styles.length,l:"Worship Styles",c:"#0891b2"},{n:languages.length,l:"Languages",c:"#d97706"},{n:services.length,l:"Services/Week",c:"#059669"},{n:other_branches.length,l:"Branches",c:"#db2777"}].map((s,i)=>(
          <div key={i} style={{ textAlign:"center", padding:"12px 4px", borderRight:i<4?"0.5px solid #e5e7eb":"none" }}>
            <div style={{ fontSize:18, fontWeight:500, color:s.c }}>{s.n}</div>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── FIRST TIME VISITOR BAND ── */}
      <div style={{ background:"#1a0d3d", padding:"14px 16px", display:"flex", alignItems:"center", gap:12, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", width:160, height:160, borderRadius:"50%", background:"#4c1d95", top:-50, right:70, opacity:0.5 }} />
        <div style={{ position:"absolute", width:100, height:100, borderRadius:"50%", background:"#0891b2", bottom:-30, right:20, opacity:0.25 }} />
        {/* QR icon in box */}
        <div style={{ width:40, height:40, borderRadius:10, background:"rgba(124,58,237,0.5)", border:"1px solid rgba(139,92,246,0.5)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative", zIndex:1 }}>
          <i className="ti ti-qrcode" style={{ fontSize:20, color:"#c4b5fd" }} />
        </div>
        <div style={{ flex:1, position:"relative", zIndex:1 }}>
          <div style={{ fontSize:13, fontWeight:500, color:"#fff", marginBottom:2 }}>Visiting For The First Time?</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>Register your visit — takes 30 seconds</div>
        </div>
        <a href={`/church/${slug}/visit`} style={{ background:"#fff", color:"#5b21b6", border:"none", borderRadius:16, padding:"8px 16px", fontSize:12, fontWeight:500, cursor:"pointer", position:"relative", zIndex:1, whiteSpace:"nowrap", textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}>
          <i className="ti ti-user-plus" style={{ fontSize:13, color:"#5b21b6" }} />Register My Visit
        </a>
      </div>

      {/* ── TABS ── */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"0.5px solid #e5e7eb", overflowX:"auto" }}>
        {[
          { key:"profile", icon:"building-church", label:"Profile" },
          { key:"team", icon:"users", label:"Our Team", count:[worship_team,it_media_team,outreach_team].filter(t=>t?.images?.length>0).length },
          { key:"branches", icon:"building-community", label:"Branches", count:other_branches.length },
        ].map(tab=>(
          <div key={tab.key} onClick={()=>setActiveTab(tab.key)}
            style={{ padding:"10px 14px", fontSize:13, fontWeight:500, cursor:"pointer", color:activeTab===tab.key?"#7c3aed":"#6b7280", borderBottom:`2px solid ${activeTab===tab.key?"#7c3aed":"transparent"}`, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5 }}>
            <i className={`ti ti-${tab.icon}`} style={{ fontSize:13 }} /> {tab.label}
            {tab.count>0 && <span style={{ background:"#f5f0ff", color:"#7c3aed", fontSize:10, padding:"1px 6px", borderRadius:8 }}>{tab.count}</span>}
          </div>
        ))}
      </div>

      {/* ── BODY ── */}
      <div style={{ background:"#f9fafb" }}>
        <div style={{ ...container }}><div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 300px", gap:12, padding:"14px 0" }}>

          {/* LEFT */}
          <div>
            {activeTab==="profile" && (
              <>
                {/* About */}
                <SCard icon="building-church" iconBg="#ede9fe" iconColor="#7c3aed" hdrBg="#faf5ff" title="About This Church">
                  {description && <p style={{ fontSize:13, color:"#6b7280", lineHeight:1.7, marginBottom:12 }}>{description}</p>}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {denomination && (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:7, background:"#f5f0ff", border:"0.5px solid #ddd6fe", borderRadius:9, padding:"8px 12px" }}>
                        <i className="ti ti-world" style={{ fontSize:14, color:"#7c3aed" }} />
                        <div><div style={{ fontSize:10, color:"#7c3aed" }}>Denomination</div><div style={{ fontSize:12, color:"#4c1d95", fontWeight:500 }}>{denomination}</div></div>
                      </span>
                    )}
                    {city && (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:7, background:"#e0f9f3", border:"0.5px solid #99f0d8", borderRadius:9, padding:"8px 12px" }}>
                        <i className="ti ti-map-pin" style={{ fontSize:14, color:"#059669" }} />
                        <div><div style={{ fontSize:10, color:"#059669" }}>Location</div><div style={{ fontSize:12, color:"#065f46", fontWeight:500 }}>{city}</div></div>
                      </span>
                    )}
                  </div>
                </SCard>

                {/* Pastor */}
                {pastor_name && (
                  <SCard icon="user" iconBg="#ccfbf1" iconColor="#0f766e" hdrBg="#f0fdfa" title="Senior Pastor">
                    <a href={pastor_id?`/pastor/${pastor_id}`:"#"} style={{ display:"flex", alignItems:"center", gap:10, background:"#f5f0ff", border:"0.5px solid #ddd6fe", borderRadius:9, padding:10, cursor:"pointer", textDecoration:"none" }}>
                      <div style={{ width:46, height:46, borderRadius:"50%", background:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <i className="ti ti-user" style={{ fontSize:22, color:"#fff" }} />
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:"#111" }}>{pastor_name}</div>
                        <div style={{ fontSize:11, color:"#7c3aed", marginTop:2 }}>Senior Pastor &nbsp;·&nbsp; {denomination}</div>
                        {city && <div style={{ fontSize:11, color:"#6b7280", marginTop:2, display:"flex", alignItems:"center", gap:3 }}><i className="ti ti-map-pin" style={{ fontSize:11 }} /> {city}</div>}
                      </div>
                      <i className="ti ti-arrow-right" style={{ fontSize:15, color:"#d1d5db", marginLeft:"auto" }} />
                    </a>
                  </SCard>
                )}

                {/* Worship Styles */}
                {worship_styles.length>0 && (
                  <SCard icon="sparkles" iconBg="#fef08a" iconColor="#ca8a04" hdrBg="#fefce8" title="Worship Styles">
                    {worship_styles.map(w=><Tag key={w} label={w} bg="#fef9ec" color="#78350f" border="#fde68a" />)}
                  </SCard>
                )}

                {/* Ministries */}
                {ministries.length>0 && (
                  <SCard icon="users" iconBg="#fecdd3" iconColor="#be123c" hdrBg="#fff1f2" title="Ministries & Outreach">
                    {ministries.map(m=><Tag key={m} label={m} bg="#fff1ee" color="#9f1239" border="#fecdc7" />)}
                  </SCard>
                )}

                {/* Languages */}
                {languages.length>0 && (
                  <SCard icon="language" iconBg="#ccfbf1" iconColor="#0f766e" hdrBg="#f0fdfa" title="Languages Spoken">
                    {languages.map(l=><Tag key={l} label={l} bg="#e0f9f3" color="#065f46" border="#99f0d8" />)}
                  </SCard>
                )}

                {/* Facilities */}
                {facilities.length>0 && (
                  <SCard icon="building" iconBg="#bfdbfe" iconColor="#1d4ed8" hdrBg="#eff6ff" title="Facilities">
                    {facilities.map(f=><Tag key={f} label={f} bg="#eff6ff" color="#1e40af" border="#bfdbfe" />)}
                  </SCard>
                )}

                {/* Gallery — 3 per row */}
                {gallery_images.length>0 && (
                  <SCard icon="photo" iconBg="#bfdbfe" iconColor="#1d4ed8" hdrBg="#eff6ff" title="Gallery">
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                      {gallery_images.slice(0,8).map((img,i)=>(
                        <div key={i} style={{ aspectRatio:"4/3", borderRadius:8, overflow:"hidden", border:"0.5px solid #e5e7eb", cursor:"pointer" }}>
                          <img src={img} alt={`gallery ${i}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy" />
                        </div>
                      ))}
                      {gallery_images.length>8 && (
                        <div style={{ aspectRatio:"4/3", borderRadius:8, background:"#f5f0ff", border:"0.5px solid #ddd6fe", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                          <span style={{ fontSize:12, color:"#5b21b6", fontWeight:500 }}>+{gallery_images.length-8} more</span>
                        </div>
                      )}
                    </div>
                  </SCard>
                )}
              </>
            )}

            {activeTab==="team" && (
              <>
                {[
                  {team:worship_team,label:"Worship Team",icon:"music",color:"#7c3aed",bg:"rgba(124,58,237,0.3)",tc:"#c4b5fd",border:"rgba(139,92,246,0.4)"},
                  {team:it_media_team,label:"IT & Media Team",icon:"device-tv",color:"#1d4ed8",bg:"rgba(29,78,216,0.3)",tc:"#93c5fd",border:"rgba(59,130,246,0.4)"},
                  {team:outreach_team,label:"Outreach Team",icon:"heart",color:"#15803d",bg:"rgba(21,128,61,0.3)",tc:"#86efac",border:"rgba(34,197,94,0.4)"},
                ].filter(({team})=>team?.images?.length>0).map(({team,label,icon,color,bg,tc,border})=>(
                  <div key={label} style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
                    <div style={{ height:140, position:"relative", overflow:"hidden", background:"#1a0d3d" }}>
                      <img src={team.images[0]} alt={label} style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.7, display:"block" }} />
                      <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.05) 65%)" }} />
                      <span style={{ position:"absolute", top:10, right:10, display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:500, padding:"3px 10px", borderRadius:10, background:bg, color:tc, border:`0.5px solid ${border}` }}>
                        <i className={`ti ti-${icon}`} style={{ fontSize:11 }} /> {label}
                      </span>
                      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 14px", display:"flex", alignItems:"flex-end", gap:10 }}>
                        <div style={{ display:"flex" }}>
                          {team.images.slice(0,3).map((img,i)=>(
                            <div key={i} style={{ width:34, height:34, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.4)", overflow:"hidden", marginRight:-8, zIndex:3-i }}>
                              <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize:14, fontWeight:500, color:"#fff" }}>{label}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>{team.images.length} members</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding:"12px 14px" }}>
                      {team.description && <p style={{ fontSize:12, color:"#6b7280", lineHeight:1.6, marginBottom:10 }}>{team.description}</p>}
                      {team.video_urls?.slice(0,2).map((url,i)=>(
                        <a key={i} href={fixUrl(url)||"#"} target="_blank" rel="noreferrer"
                          style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:500, padding:"5px 12px", borderRadius:16, cursor:"pointer", border:`0.5px solid ${border}`, background:"#f5f0ff", color, textDecoration:"none", marginRight:6, marginTop:4 }}>
                          <i className="ti ti-brand-youtube" style={{ fontSize:13 }} /> Watch Video {i+1}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab==="branches" && (
              <BranchesTab branches={other_branches} mainChurch={church} />
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <div>
            {/* Service Schedule */}
            {services.length>0 && (
              <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
                <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#f0fdf4", borderBottom:"0.5px solid #bbf7d0" }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:"#bbf7d0", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-clock" style={{ fontSize:15, color:"#15803d" }} /></div>
                  <span style={{ fontSize:13, fontWeight:500, color:"#15803d" }}>Service Schedule</span>
                </div>
                <div style={{ padding:"8px 14px 12px" }}>
                  {services.map((s,i)=>{
                    const startTime=s.start_time||s.startTime||"";
                    const endTime=s.end_time||s.endTime||"";
                    const eventName=s.event_name||s.eventName||s.name||"";
                    const isToday=s.day?.toLowerCase()===new Date().toLocaleDateString("en-GB",{weekday:"long"}).toLowerCase();
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 0", borderBottom:i<services.length-1?"0.5px solid #e5e7eb":"none", fontSize:12, flexWrap:"nowrap" }}>
                        <span style={{ minWidth:55, fontWeight:500, color:"#111", flexShrink:0 }}>{s.day}</span>
                        <span style={{ flex:1, color:"#6b7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{eventName}{isToday&&<span style={{ background:"#d1fae5", color:"#065f46", fontSize:10, padding:"2px 6px", borderRadius:5, marginLeft:4 }}>Today</span>}</span>
                        <span style={{ color:"#7c3aed", fontWeight:500, fontSize:10, background:"#f5f0ff", padding:"3px 7px", borderRadius:7, whiteSpace:"nowrap", flexShrink:0 }}>{startTime}{endTime?` — ${endTime}`:""}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location — Map only */}
            <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
              <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#eff6ff", borderBottom:"0.5px solid #bfdbfe" }}>
                <div style={{ width:28, height:28, borderRadius:7, background:"#bfdbfe", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-map" style={{ fontSize:15, color:"#1d4ed8" }} /></div>
                <span style={{ fontSize:13, fontWeight:500, color:"#1d4ed8" }}>Location</span>
              </div>
              <div style={{ padding:"12px 14px" }}>
                {lat && lng ? (
                  <iframe src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=${lat},${lng}&zoom=15`}
                    style={{ width:"100%", height:150, borderRadius:8, border:"0.5px solid #bfdbfe", marginBottom:10, display:"block" }}
                    allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="church location" />
                ) : (
                  <div style={{ height:150, background:"#eff6ff", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", border:"0.5px solid #bfdbfe", marginBottom:10 }}>
                    <i className="ti ti-map" style={{ fontSize:32, color:"#93c5fd" }} />
                  </div>
                )}
                {address && <div style={{ fontSize:12, color:"#6b7280", display:"flex", alignItems:"center", gap:4, marginBottom:8 }}><i className="ti ti-map-pin" style={{ fontSize:13, color:"#7c3aed" }} /> {address}</div>}
                {google_maps_link && (
                  <a href={google_maps_link} target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, width:"100%", background:"#7c3aed", color:"#fff", border:"none", borderRadius:8, padding:8, fontSize:12, fontWeight:500, cursor:"pointer", textDecoration:"none" }}>
                    <i className="ti ti-navigation" style={{ fontSize:14 }} /> Open in Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* Watch Live */}
            {video_url && (
              <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
                <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#fff1f2", borderBottom:"0.5px solid #fecdd3" }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:"#fecdd3", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-brand-youtube" style={{ fontSize:15, color:"#be123c" }} /></div>
                  <span style={{ fontSize:13, fontWeight:500, color:"#be123c" }}>Watch Live</span>
                </div>
                <div style={{ padding:"12px 14px" }}>
                  <a href={video_url} target="_blank" rel="noreferrer" style={{ display:"block", textDecoration:"none" }}>
                    <div style={{ height:100, borderRadius:8, overflow:"hidden", position:"relative", background:"#1a0d3d" }}>
                      {gallery_images[0] && <img src={gallery_images[0]} alt="video" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.65, display:"block" }} />}
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.25)" }}>
                        <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.9)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <i className="ti ti-player-play" style={{ fontSize:18, color:"#be123c", marginLeft:2 }} />
                        </div>
                      </div>
                    </div>
                  </a>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:7, textAlign:"center" }}>Watch our latest service on YouTube</div>
                </div>
              </div>
            )}

            {/* QR Scan & Share */}
            <div style={{ background:"#f5f0ff", border:"0.5px solid #ddd6fe", borderRadius:12, padding:"10px 13px", display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ width:40, height:40, background:"#fff", borderRadius:7, border:"0.5px solid #ddd6fe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <i className="ti ti-qrcode" style={{ fontSize:24, color:"#c4b5fd" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"#4c1d95" }}>Scan & Share</div>
                <div style={{ fontSize:11, color:"#7c3aed", marginTop:1 }}>Share this church listing</div>
              </div>
              <button style={{ background:"#7c3aed", border:"none", borderRadius:7, padding:"6px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"inherit", whiteSpace:"nowrap" }}>
                <i className="ti ti-qrcode" style={{ fontSize:12 }} /> Get QR
              </button>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* ── FULL WIDTH CONTACT (at bottom) ── */}
      <div style={{ ...container, marginBottom:14 }}><div ref={contactRef} style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"13px 16px 11px", display:"flex", alignItems:"center", gap:10, background:"#faf5ff", borderBottom:"0.5px solid #ede9fe" }}>
          <div style={{ width:30, height:30, borderRadius:8, background:"#ede9fe", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="ti ti-message" style={{ fontSize:16, color:"#7c3aed" }} /></div>
          <span style={{ fontSize:14, fontWeight:500, color:"#5b21b6" }}>Contact This Church</span>
          <span style={{ marginLeft:"auto", fontSize:12, color:"#6b7280" }}>We'll get back to you soon</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
          <div style={{ padding:20, borderRight:"0.5px solid #e5e7eb" }}>
            <div style={{ fontSize:13, fontWeight:500, color:"#111", marginBottom:14 }}>Send a message</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:9 }}>
              <input placeholder="Your name *" style={{ padding:"9px 12px", fontSize:13, border:"0.5px solid #e5e7eb", borderRadius:8, background:"#f9fafb", fontFamily:"inherit", outline:"none" }} />
              <input type="email" placeholder="Your email *" style={{ padding:"9px 12px", fontSize:13, border:"0.5px solid #e5e7eb", borderRadius:8, background:"#f9fafb", fontFamily:"inherit", outline:"none" }} />
            </div>
            <input placeholder="Subject" style={{ width:"100%", padding:"9px 12px", fontSize:13, border:"0.5px solid #e5e7eb", borderRadius:8, background:"#f9fafb", fontFamily:"inherit", outline:"none", marginBottom:9, boxSizing:"border-box" }} />
            <textarea placeholder="Your message *" style={{ width:"100%", height:88, padding:"9px 12px", fontSize:13, border:"0.5px solid #e5e7eb", borderRadius:8, background:"#f9fafb", fontFamily:"inherit", outline:"none", resize:"vertical", marginBottom:9, boxSizing:"border-box" }} />
            <button style={{ width:"100%", background:"#7c3aed", color:"#fff", border:"none", borderRadius:8, padding:10, fontSize:13, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit" }}>
              <i className="ti ti-send" style={{ fontSize:15 }} /> Send Message
            </button>
          </div>
          <div style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:500, color:"#111", marginBottom:14 }}>Get in touch directly</div>
            {[
              {icon:"map-pin",bg:"linear-gradient(135deg,#7c3aed,#a78bfa)",label:"Address",value:address},
              {icon:"phone",bg:"linear-gradient(135deg,#059669,#34d399)",label:"Phone",value:phone,color:"#059669"},
              {icon:"mail",bg:"linear-gradient(135deg,#1d4ed8,#60a5fa)",label:"Email",value:email,color:"#1d4ed8"},
              {icon:"clock",bg:"linear-gradient(135deg,#d97706,#fbbf24)",label:"Office hours",value:"Mon–Fri 9:00 AM — 5:00 PM"},
            ].filter(r=>r.value).map(row=>(
              <div key={row.label} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:"0.5px solid #e5e7eb" }}>
                <div style={{ width:36, height:36, borderRadius:9, background:row.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <i className={`ti ti-${row.icon}`} style={{ fontSize:15, color:"#fff" }} />
                </div>
                <div><div style={{ fontSize:11, color:"#6b7280" }}>{row.label}</div><div style={{ fontSize:13, color:row.color||"#111", wordBreak:"break-all" }}>{row.value}</div></div>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
              {socials.map(soc=>(
                <a key={soc.icon} href={soc.href} target="_blank" rel="noreferrer"
                  style={{ width:38, height:38, borderRadius:"50%", background:soc.bg, display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none" }}>
                  <i className={`ti ti-${soc.icon}`} style={{ fontSize:19, color:"#fff" }} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* ── NEARBY CHURCHES ── */}
      <NearbyChurches currentSlug={slug} city={city} />

      {/* ── CHAT WIDGET ── */}
      <ListingChatWidget
        entityType="church"
        entityId={church.id}
        entityName={church.name}
        entityRole={church.denomination || "Church"}
        entityAvatar={church.logo}
        isOwner={false}
      />

      </div>

      {/* ── FOOTER ── */}
      <div style={{ ...container }}><div style={{ background:"#fff", borderTop:"0.5px solid #e5e7eb", padding:"14px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <span style={{ fontSize:12, color:"#9ca3af" }}>© 2026 ChurchNavigator — Finding your spiritual home</span>
        <div style={{ display:"flex", gap:16 }}>
          {["Privacy","Terms","Add your church"].map(l=>(
            <span key={l} style={{ fontSize:12, color:"#9ca3af", cursor:"pointer" }}>{l}</span>
          ))}
        </div>
      </div>

    </div>
  );
}
