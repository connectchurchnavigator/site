/* eslint-disable */
import React from "react";

const API_URL = process.env.REACT_APP_BACKEND_URL || "https://api.churchnavigator.com";

export default function ChurchDetailPage() {
  const [church, setChurch] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("profile");
  const contactRef = React.useRef(null);

  React.useEffect(() => {
    const slug = window.location.pathname.split("/church/")[1]?.split("/")[0];
    if (!slug) { setLoading(false); return; }
    fetch(`${API_URL}/api/churches/${slug}`)
      .then(r => r.json())
      .then(data => { setChurch(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#fff" }}>
      <div style={{ textAlign:"center" }}>
        <i className="ti ti-building-church" style={{ fontSize:48, color:"#7c3aed", display:"block", marginBottom:12 }} />
        <div style={{ fontSize:14, color:"#6b7280" }}>Loading church...</div>
      </div>
    </div>
  );

  if (!church) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:14, color:"#6b7280" }}>Church not found</div>
      </div>
    </div>
  );

  const name = church.name || "Church";
  const description = church.description || "";
  const cover_image = church.cover_image || "";
  const logo = church.logo || "";
  const address = church.address_line1 || "";
  const city = church.city || "";
  const phone = church.phone || "";
  const email = church.email || "";
  const website = church.website || "";
  const denomination = church.denomination || "";
  const ministries = Array.isArray(church.ministries) ? church.ministries : [];
  const worship_styles = Array.isArray(church.worship_styles) ? church.worship_styles : [];
  const languages = Array.isArray(church.languages) ? church.languages : [];
  const facilities = Array.isArray(church.facilities) ? church.facilities : [];
  const services = Array.isArray(church.services) ? church.services : [];
  const gallery_images = Array.isArray(church.gallery_images) ? church.gallery_images : [];
  const google_maps_link = church.google_maps_link || "";
  const facebook = church.facebook || "";
  const instagram = church.instagram || "";
  const youtube = church.youtube || "";
  const twitter = church.twitter || "";
  const pastor_name = church.pastor_name || "";
  const pastor_id = church.pastor_id || "";
  const other_branches = Array.isArray(church.other_branches) ? church.other_branches : [];
  const worship_team = church.worship_team || {};
  const it_media_team = church.it_media_team || {};
  const outreach_team = church.outreach_team || {};
  const video_url = church.video_url || youtube || "";
  const slug = church.slug || "";

  const Tag = ({ label, bg, color, border }) => (
    <span style={{ display:"inline-flex", fontSize:11, padding:"4px 9px", borderRadius:10, margin:2, background:bg, color, border:`0.5px solid ${border}` }}>{label}</span>
  );

  const SCard = ({ icon, iconBg, iconColor, hdrBg, title, children }) => (
    <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:hdrBg, borderBottom:"0.5px solid #e5e7eb" }}>
        <div style={{ width:28, height:28, borderRadius:7, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className={`ti ti-${icon}`} style={{ fontSize:15, color:iconColor }} />
        </div>
        <span style={{ fontSize:13, fontWeight:500, color:iconColor }}>{title}</span>
      </div>
      <div style={{ padding:"12px 14px" }}>{children}</div>
    </div>
  );

  const InfoRow = ({ icon, bg, label, value, color }) => (
    <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:"0.5px solid #e5e7eb" }}>
      <div style={{ width:36, height:36, borderRadius:9, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <i className={`ti ti-${icon}`} style={{ fontSize:15, color:"#fff" }} />
      </div>
      <div>
        <div style={{ fontSize:11, color:"#6b7280" }}>{label}</div>
        <div style={{ fontSize:13, color: color || "#111", wordBreak:"break-all" }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{ background:"#f9fafb", minHeight:"100vh" }}>

      {/* ── HERO ── */}
      <div style={{ position:"relative", height:260, overflow:"hidden", background:"#1a0d3d" }}>
        {cover_image && <img src={cover_image} alt={name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />}
        <div style={{ position:"absolute", width:420, height:420, borderRadius:"50%", background:"#4c1d95", top:-120, right:-60, opacity:0.35 }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(10,5,30,0.93) 0%,rgba(10,5,30,0.1) 75%)" }} />

        {/* Top badges */}
        <div style={{ position:"absolute", top:14, left:16, display:"flex", gap:7, flexWrap:"wrap", zIndex:2 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:10, background:"rgba(16,185,129,0.2)", color:"#6ee7b7", border:"0.5px solid rgba(16,185,129,0.35)" }}>
            <i className="ti ti-circle-check" style={{ fontSize:11 }} /> Open Sunday
          </span>
          {other_branches.length > 0 && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:10, background:"rgba(139,92,246,0.25)", color:"#c4b5fd", border:"0.5px solid rgba(139,92,246,0.4)" }}>
              <i className="ti ti-building-community" style={{ fontSize:11 }} /> {other_branches.length} Branches
            </span>
          )}
        </div>

        {/* Top right */}
        <div style={{ position:"absolute", top:14, right:16, display:"flex", gap:7, zIndex:2 }}>
          <button style={{ background:"rgba(255,255,255,0.15)", border:"0.5px solid rgba(255,255,255,0.3)", borderRadius:18, padding:"5px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
            <i className="ti ti-bookmark" style={{ fontSize:13 }} /> Save
          </button>
          <button style={{ background:"rgba(255,255,255,0.15)", border:"0.5px solid rgba(255,255,255,0.3)", borderRadius:18, padding:"5px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
            <i className="ti ti-share" style={{ fontSize:13 }} /> Share
          </button>
          <button style={{ background:"rgba(255,255,255,0.15)", border:"0.5px solid rgba(255,255,255,0.3)", borderRadius:18, padding:"5px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
            <i className="ti ti-shield-check" style={{ fontSize:13 }} /> Claim
          </button>
        </div>

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
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            {google_maps_link && (
              <a href={google_maps_link} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, background:"#7c3aed", color:"#fff", textDecoration:"none", whiteSpace:"nowrap" }}>
                <i className="ti ti-navigation" style={{ fontSize:14 }} /> Get Directions
              </a>
            )}
            <a href={`/church/${slug}/visit`}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, color:"#fff", background:"rgba(16,185,129,0.3)", border:"1px solid rgba(16,185,129,0.5)", textDecoration:"none", whiteSpace:"nowrap" }}>
              <i className="ti ti-qrcode" style={{ fontSize:14 }} /> Check In
            </a>
            {phone && (
              <a href={`tel:${phone}`} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.35)", textDecoration:"none", whiteSpace:"nowrap" }}>
                <i className="ti ti-phone" style={{ fontSize:14 }} /> Call
              </a>
            )}
            {(video_url || youtube) && (
              <a href={video_url || youtube} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.35)", textDecoration:"none", whiteSpace:"nowrap" }}>
                <i className="ti ti-brand-youtube" style={{ fontSize:14 }} /> Watch Live
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", background:"#fff", borderBottom:"0.5px solid #e5e7eb" }}>
        {[
          { n: ministries.length, l:"Ministries", c:"#7c3aed" },
          { n: worship_styles.length, l:"Worship Styles", c:"#0891b2" },
          { n: languages.length, l:"Languages", c:"#d97706" },
          { n: services.length, l:"Services/Week", c:"#059669" },
          { n: other_branches.length, l:"Branches", c:"#db2777" },
        ].map((s,i) => (
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
        <div style={{ width:40, height:40, borderRadius:10, background:"rgba(124,58,237,0.5)", border:"1px solid rgba(139,92,246,0.5)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative", zIndex:1 }}>
          <i className="ti ti-qrcode" style={{ fontSize:20, color:"#c4b5fd" }} />
        </div>
        <div style={{ flex:1, position:"relative", zIndex:1 }}>
          <div style={{ fontSize:13, fontWeight:500, color:"#fff", marginBottom:2 }}>Visiting For The First Time?</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>Register your visit — takes 30 seconds</div>
        </div>
        <a href={`/church/${slug}/visit`} style={{ background:"#fff", color:"#5b21b6", border:"none", borderRadius:16, padding:"8px 16px", fontSize:12, fontWeight:500, cursor:"pointer", position:"relative", zIndex:1, whiteSpace:"nowrap", textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}>
          <i className="ti ti-user-plus" style={{ fontSize:13 }} />Register My Visit
        </a>
      </div>

      {/* ── TABS ── */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"0.5px solid #e5e7eb", overflowX:"auto" }}>
        {[
          { key:"profile", icon:"building-church", label:"Profile" },
          { key:"team", icon:"users", label:"Our Team", count:[worship_team,it_media_team,outreach_team].filter(t=>t?.images?.length>0).length },
          { key:"branches", icon:"building-community", label:"Branches", count:other_branches.length },
        ].map(tab => (
          <div key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding:"10px 14px", fontSize:13, fontWeight:500, cursor:"pointer", color:activeTab===tab.key?"#7c3aed":"#6b7280", borderBottom:`2px solid ${activeTab===tab.key?"#7c3aed":"transparent"}`, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5 }}>
            <i className={`ti ti-${tab.icon}`} style={{ fontSize:13 }} />
            {tab.label}
            {tab.count > 0 && <span style={{ background:"#f5f0ff", color:"#7c3aed", fontSize:10, padding:"1px 6px", borderRadius:8 }}>{tab.count}</span>}
          </div>
        ))}
      </div>

      {/* ── BODY ── */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 250px", gap:12, padding:14, background:"#f9fafb" }}>

        {/* LEFT */}
        <div>
          {activeTab === "profile" && (
            <>
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

              {pastor_name && (
                <SCard icon="user" iconBg="#ccfbf1" iconColor="#0f766e" hdrBg="#f0fdfa" title="Senior Pastor">
                  <a href={pastor_id ? `/pastor/${pastor_id}` : "#"} style={{ display:"flex", alignItems:"center", gap:10, background:"#f5f0ff", border:"0.5px solid #ddd6fe", borderRadius:9, padding:10, cursor:"pointer", textDecoration:"none" }}>
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

              {worship_styles.length > 0 && (
                <SCard icon="sparkles" iconBg="#fef08a" iconColor="#ca8a04" hdrBg="#fefce8" title="Worship Styles">
                  {worship_styles.map(w => <Tag key={w} label={w} bg="#fef9ec" color="#78350f" border="#fde68a" />)}
                </SCard>
              )}

              {ministries.length > 0 && (
                <SCard icon="users" iconBg="#fecdd3" iconColor="#be123c" hdrBg="#fff1f2" title="Ministries & Outreach">
                  {ministries.map(m => <Tag key={m} label={m} bg="#fff1ee" color="#9f1239" border="#fecdc7" />)}
                </SCard>
              )}

              {languages.length > 0 && (
                <SCard icon="language" iconBg="#ccfbf1" iconColor="#0f766e" hdrBg="#f0fdfa" title="Languages Spoken">
                  {languages.map(l => <Tag key={l} label={l} bg="#e0f9f3" color="#065f46" border="#99f0d8" />)}
                </SCard>
              )}

              {facilities.length > 0 && (
                <SCard icon="building" iconBg="#bfdbfe" iconColor="#1d4ed8" hdrBg="#eff6ff" title="Facilities">
                  {facilities.map(f => <Tag key={f} label={f} bg="#eff6ff" color="#1e40af" border="#bfdbfe" />)}
                </SCard>
              )}

              {gallery_images.length > 0 && (
                <SCard icon="photo" iconBg="#bfdbfe" iconColor="#1d4ed8" hdrBg="#eff6ff" title="Gallery">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                    {gallery_images.slice(0,8).map((img,i) => (
                      <div key={i} style={{ aspectRatio:"4/3", borderRadius:8, overflow:"hidden", border:"0.5px solid #e5e7eb" }}>
                        <img src={img} alt={`gallery ${i}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy" />
                      </div>
                    ))}
                    {gallery_images.length > 8 && (
                      <div style={{ aspectRatio:"4/3", borderRadius:8, background:"#f5f0ff", border:"0.5px solid #ddd6fe", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:12, color:"#5b21b6", fontWeight:500 }}>+{gallery_images.length-8} more</span>
                      </div>
                    )}
                  </div>
                </SCard>
              )}
            </>
          )}

          {activeTab === "team" && (
            <>
              {[
                { team: worship_team, label:"Worship Team", icon:"music", color:"#7c3aed", bg:"rgba(124,58,237,0.3)", tc:"#c4b5fd", border:"rgba(139,92,246,0.4)" },
                { team: it_media_team, label:"IT & Media Team", icon:"device-tv", color:"#1d4ed8", bg:"rgba(29,78,216,0.3)", tc:"#93c5fd", border:"rgba(59,130,246,0.4)" },
                { team: outreach_team, label:"Outreach Team", icon:"heart", color:"#15803d", bg:"rgba(21,128,61,0.3)", tc:"#86efac", border:"rgba(34,197,94,0.4)" },
              ].filter(({ team }) => team?.images?.length > 0).map(({ team, label, icon, color, bg, tc, border }) => (
                <div key={label} style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
                  <div style={{ height:140, position:"relative", overflow:"hidden", background:"#1a0d3d" }}>
                    <img src={team.images[0]} alt={label} style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.7, display:"block" }} />
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.05) 65%)" }} />
                    <span style={{ position:"absolute", top:10, right:10, display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:500, padding:"3px 10px", borderRadius:10, background:bg, color:tc, border:`0.5px solid ${border}` }}>
                      <i className={`ti ti-${icon}`} style={{ fontSize:11 }} /> {label}
                    </span>
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 14px", display:"flex", alignItems:"flex-end", gap:10 }}>
                      <div style={{ display:"flex" }}>
                        {team.images.slice(0,3).map((img,i) => (
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
                    {team.video_urls?.slice(0,2).map((url,i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:500, padding:"5px 12px", borderRadius:16, cursor:"pointer", border:`0.5px solid ${border}`, background:"#f5f0ff", color, textDecoration:"none", marginRight:6, marginTop:4 }}>
                        <i className="ti ti-brand-youtube" style={{ fontSize:13 }} /> Watch Video {i+1}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === "branches" && (
            <SCard icon="building-community" iconBg="#ede9fe" iconColor="#7c3aed" hdrBg="#faf5ff" title={`Church Branches (${other_branches.length})`}>
              {other_branches.length === 0 ? (
                <div style={{ fontSize:13, color:"#6b7280", textAlign:"center", padding:20 }}>No branches listed yet.</div>
              ) : other_branches.map((branchId, i) => (
                <div key={i} style={{ background:"#f9fafb", border:"0.5px solid #e5e7eb", borderRadius:10, padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:["#7c3aed","#059669","#d97706"][i%3], display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <i className="ti ti-building-church" style={{ fontSize:18, color:"#fff" }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:"#111" }}>Branch {i+1}</div>
                    <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{city}, UK</div>
                  </div>
                  <button style={{ background:"#7c3aed", color:"#fff", border:"none", borderRadius:7, padding:"5px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                    <i className="ti ti-navigation" style={{ fontSize:12 }} /> Directions
                  </button>
                </div>
              ))}
            </SCard>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div>
          {/* Service Schedule */}
          {services.length > 0 && (
            <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
              <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#f0fdf4", borderBottom:"0.5px solid #bbf7d0" }}>
                <div style={{ width:28, height:28, borderRadius:7, background:"#bbf7d0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <i className="ti ti-clock" style={{ fontSize:15, color:"#15803d" }} />
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:"#15803d" }}>Service Schedule</span>
              </div>
              <div style={{ padding:"8px 14px 12px" }}>
                {services.map((s,i) => {
                  const startTime = s.start_time || s.startTime || "";
                  const endTime = s.end_time || s.endTime || "";
                  const eventName = s.event_name || s.eventName || s.name || "";
                  const isToday = s.day?.toLowerCase() === new Date().toLocaleDateString("en-GB",{weekday:"long"}).toLowerCase();
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:i<services.length-1?"0.5px solid #e5e7eb":"none", fontSize:12 }}>
                      <span style={{ minWidth:60, fontWeight:500, color:"#111" }}>{s.day}</span>
                      <span style={{ flex:1, color:"#6b7280" }}>
                        {eventName}
                        {isToday && <span style={{ background:"#d1fae5", color:"#065f46", fontSize:10, padding:"2px 6px", borderRadius:5, marginLeft:4 }}>Today</span>}
                      </span>
                      <span style={{ color:"#7c3aed", fontWeight:500, fontSize:11, background:"#f5f0ff", padding:"3px 7px", borderRadius:7, whiteSpace:"nowrap" }}>
                        {startTime}{endTime?` — ${endTime}`:""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location */}
          <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
            <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#eff6ff", borderBottom:"0.5px solid #bfdbfe" }}>
              <div style={{ width:28, height:28, borderRadius:7, background:"#bfdbfe", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="ti ti-map" style={{ fontSize:15, color:"#1d4ed8" }} />
              </div>
              <span style={{ fontSize:13, fontWeight:500, color:"#1d4ed8" }}>Location & Contact</span>
            </div>
            <div style={{ padding:"12px 14px" }}>
              <div style={{ height:150, background:"#eff6ff", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", border:"0.5px solid #bfdbfe", marginBottom:12 }}>
                <i className="ti ti-map" style={{ fontSize:32, color:"#93c5fd" }} />
              </div>
              {[
                { icon:"map-pin", bg:"linear-gradient(135deg,#7c3aed,#a78bfa)", label:"Address", value:address },
                { icon:"phone", bg:"linear-gradient(135deg,#059669,#34d399)", label:"Phone", value:phone, color:"#059669" },
                { icon:"mail", bg:"linear-gradient(135deg,#1d4ed8,#60a5fa)", label:"Email", value:email, color:"#1d4ed8" },
              ].filter(r => r.value).map(row => (
                <div key={row.label} style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 0", borderBottom:"0.5px solid #e5e7eb" }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:row.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <i className={`ti ti-${row.icon}`} style={{ fontSize:14, color:"#fff" }} />
                  </div>
                  <span style={{ fontSize:12, color:row.color||"#111", flex:1, wordBreak:"break-all" }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                {[
                  { icon:"brand-facebook", bg:"linear-gradient(135deg,#1877f2,#42a5f5)", href:facebook },
                  { icon:"brand-instagram", bg:"linear-gradient(135deg,#833ab4,#e1306c)", href:instagram },
                  { icon:"brand-youtube", bg:"linear-gradient(135deg,#ff0000,#cc0000)", href:youtube },
                  { icon:"brand-twitter", bg:"linear-gradient(135deg,#111,#333)", href:twitter },
                ].filter(s => s.href).map(soc => (
                  <a key={soc.icon} href={soc.href} target="_blank" rel="noreferrer"
                    style={{ width:36, height:36, borderRadius:"50%", background:soc.bg, display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none" }}>
                    <i className={`ti ti-${soc.icon}`} style={{ fontSize:18, color:"#fff" }} />
                  </a>
                ))}
              </div>
              {google_maps_link && (
                <a href={google_maps_link} target="_blank" rel="noreferrer"
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, width:"100%", background:"#7c3aed", color:"#fff", border:"none", borderRadius:8, padding:8, fontSize:12, fontWeight:500, cursor:"pointer", textDecoration:"none", marginTop:12 }}>
                  <i className="ti ti-navigation" style={{ fontSize:14 }} /> Open in Google Maps
                </a>
              )}
            </div>
          </div>

          {/* Watch Live */}
          {(video_url || youtube) && (
            <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
              <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#fff1f2", borderBottom:"0.5px solid #fecdd3" }}>
                <div style={{ width:28, height:28, borderRadius:7, background:"#fecdd3", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <i className="ti ti-brand-youtube" style={{ fontSize:15, color:"#be123c" }} />
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:"#be123c" }}>Watch Live</span>
              </div>
              <div style={{ padding:"12px 14px" }}>
                <a href={video_url || youtube} target="_blank" rel="noreferrer" style={{ display:"block", textDecoration:"none" }}>
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
            <a href={`/api/qr/${slug}`} target="_blank" rel="noreferrer"
              style={{ background:"#7c3aed", border:"none", borderRadius:7, padding:"6px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, textDecoration:"none", whiteSpace:"nowrap" }}>
              <i className="ti ti-qrcode" style={{ fontSize:12 }} /> Get QR
            </a>
          </div>
        </div>
      </div>

      {/* ── FULL WIDTH CONTACT ── */}
      <div ref={contactRef} style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", margin:"0 14px 14px" }}>
        <div style={{ padding:"13px 16px 11px", display:"flex", alignItems:"center", gap:10, background:"#faf5ff", borderBottom:"0.5px solid #ede9fe" }}>
          <div style={{ width:30, height:30, borderRadius:8, background:"#ede9fe", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <i className="ti ti-message" style={{ fontSize:16, color:"#7c3aed" }} />
          </div>
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
            {address && <InfoRow icon="map-pin" bg="linear-gradient(135deg,#7c3aed,#a78bfa)" label="Address" value={address} />}
            {phone && <InfoRow icon="phone" bg="linear-gradient(135deg,#059669,#34d399)" label="Phone" value={phone} color="#059669" />}
            {email && <InfoRow icon="mail" bg="linear-gradient(135deg,#1d4ed8,#60a5fa)" label="Email" value={email} color="#1d4ed8" />}
            <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
              {[
                { icon:"brand-facebook", bg:"linear-gradient(135deg,#1877f2,#42a5f5)", href:facebook },
                { icon:"brand-instagram", bg:"linear-gradient(135deg,#833ab4,#e1306c)", href:instagram },
                { icon:"brand-youtube", bg:"linear-gradient(135deg,#ff0000,#cc0000)", href:youtube },
                { icon:"brand-twitter", bg:"linear-gradient(135deg,#111,#333)", href:twitter },
                { icon:"brand-whatsapp", bg:"linear-gradient(135deg,#25d366,#128c7e)", href:phone?`https://wa.me/${phone.replace(/\D/g,"")}`:null },
              ].filter(s => s.href).map(soc => (
                <a key={soc.icon} href={soc.href} target="_blank" rel="noreferrer"
                  style={{ width:38, height:38, borderRadius:"50%", background:soc.bg, display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none" }}>
                  <i className={`ti ti-${soc.icon}`} style={{ fontSize:19, color:"#fff" }} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background:"#fff", borderTop:"0.5px solid #e5e7eb", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <span style={{ fontSize:12, color:"#9ca3af" }}>© 2026 ChurchNavigator — Finding your spiritual home</span>
        <div style={{ display:"flex", gap:16 }}>
          {["Privacy","Terms","Add your church"].map(l => (
            <span key={l} style={{ fontSize:12, color:"#9ca3af", cursor:"pointer" }}>{l}</span>
          ))}
        </div>
      </div>

    </div>
  );
}
