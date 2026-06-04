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
  const denomination = church.denomination || "";
  const ministries = church.ministries || [];
  const worship_styles = church.worship_styles || [];
  const languages = church.languages || [];
  const services = church.services || [];
  const gallery_images = church.gallery_images || [];
  const google_maps_link = church.google_maps_link || "";
  const facebook = church.facebook || "";
  const instagram = church.instagram || "";
  const youtube = church.youtube || "";
  const pastor_name = church.pastor_name || "";

  // Teams
  const worship_team = church.worship_team || {};
  const it_media_team = church.it_media_team || {};
  const outreach_team = church.outreach_team || {};

  const Tag = ({ label, bg, color, border }) => (
    <span style={{ display:"inline-flex", fontSize:11, padding:"4px 9px", borderRadius:10, margin:2, background:bg, color, border:`0.5px solid ${border}` }}>{label}</span>
  );

  const Card = ({ icon, iconBg, iconColor, hdrBg, title, children }) => (
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

  return (
    <div style={{ background:"#f9fafb", minHeight:"100vh" }}>

      {/* HERO */}
      <div style={{ position:"relative", height:280, overflow:"hidden", background:"#1a0d3d" }}>
        {cover_image && <img src={cover_image} alt={name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(10,5,30,0.93) 0%,rgba(10,5,30,0.15) 75%)" }} />

        {/* Badges top left */}
        <div style={{ position:"absolute", top:14, left:16, display:"flex", gap:7, zIndex:2 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:500, padding:"3px 9px", borderRadius:10, background:"rgba(16,185,129,0.2)", color:"#6ee7b7", border:"0.5px solid rgba(16,185,129,0.35)" }}>
            <i className="ti ti-circle-check" style={{ fontSize:11 }} /> Open Sunday
          </span>
        </div>

        {/* Top right buttons */}
        <div style={{ position:"absolute", top:14, right:16, display:"flex", gap:7, zIndex:2 }}>
          <button style={{ background:"rgba(255,255,255,0.15)", border:"0.5px solid rgba(255,255,255,0.3)", borderRadius:18, padding:"5px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
            <i className="ti ti-bookmark" style={{ fontSize:13 }} /> Save
          </button>
          <button style={{ background:"rgba(255,255,255,0.15)", border:"0.5px solid rgba(255,255,255,0.3)", borderRadius:18, padding:"5px 11px", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:"inherit" }}>
            <i className="ti ti-share" style={{ fontSize:13 }} /> Share
          </button>
        </div>

        {/* Hero bottom */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"18px 20px", zIndex:2 }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:14 }}>
            <div style={{ width:56, height:56, borderRadius:"50%", border:"2.5px solid rgba(255,255,255,0.3)", overflow:"hidden", flexShrink:0, background:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {logo ? <img src={logo} alt={name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} /> : <i className="ti ti-building-church" style={{ fontSize:24, color:"#fff" }} />}
            </div>
            <div>
              <div style={{ fontSize:24, fontWeight:500, color:"#fff", lineHeight:1.2, marginBottom:4 }}>{name}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                {address && <span><i className="ti ti-map-pin" style={{ fontSize:12 }} /> {city || address}</span>}
                {denomination && <span>· {denomination}</span>}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            {google_maps_link && (
              <a href={google_maps_link} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, cursor:"pointer", background:"#7c3aed", color:"#fff", textDecoration:"none", whiteSpace:"nowrap" }}>
                <i className="ti ti-navigation" style={{ fontSize:13 }} /> Get Directions
              </a>
            )}
            <button onClick={() => contactRef.current?.scrollIntoView({ behavior:"smooth" })}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, cursor:"pointer", color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", whiteSpace:"nowrap", fontFamily:"inherit" }}>
              <i className="ti ti-message" style={{ fontSize:13 }} /> Contact Us
            </button>
            {youtube && (
              <a href={youtube} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:18, fontSize:12, fontWeight:500, cursor:"pointer", color:"#fff", background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", whiteSpace:"nowrap", textDecoration:"none" }}>
                <i className="ti ti-brand-youtube" style={{ fontSize:13 }} /> Watch Live
              </a>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:"#fff", borderBottom:"0.5px solid #e5e7eb" }}>
        {[
          { n: services.length || 2, l:"Services/week", c:"#7c3aed" },
          { n: languages.length || 0, l:"Languages", c:"#0891b2" },
          { n: ministries.length || 0, l:"Ministries", c:"#d97706" },
          { n: gallery_images.length || 0, l:"Gallery photos", c:"#059669" },
        ].map((s,i) => (
          <div key={i} style={{ textAlign:"center", padding:"13px 4px", borderRight:i<3?"0.5px solid #e5e7eb":"none" }}>
            <div style={{ fontSize:18, fontWeight:500, color:s.c }}>{s.n}</div>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"0.5px solid #e5e7eb" }}>
        {["profile","team"].map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding:"10px 16px", fontSize:13, fontWeight:500, cursor:"pointer", color:activeTab===tab?"#7c3aed":"#6b7280", borderBottom:`2px solid ${activeTab===tab?"#7c3aed":"transparent"}`, textTransform:"capitalize" }}>
            {tab === "profile" ? "Profile" : "Our Team"}
          </div>
        ))}
      </div>

      {/* BODY */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 260px", gap:12, padding:14 }}>

        {/* LEFT */}
        <div>
          {activeTab === "profile" && (
            <>
              {/* About */}
              <Card icon="building-church" iconBg="#ede9fe" iconColor="#7c3aed" hdrBg="#faf5ff" title="About This Church">
                {description && <p style={{ fontSize:13, color:"#6b7280", lineHeight:1.75, marginBottom:14 }}>{description}</p>}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {denomination && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#f5f0ff", border:"0.5px solid #ddd6fe", borderRadius:9, padding:"7px 11px" }}>
                      <i className="ti ti-world" style={{ fontSize:13, color:"#7c3aed" }} />
                      <div><div style={{ fontSize:10, color:"#7c3aed" }}>Denomination</div><div style={{ fontSize:12, fontWeight:500, color:"#4c1d95" }}>{denomination}</div></div>
                    </span>
                  )}
                  {city && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#e0f9f3", border:"0.5px solid #99f0d8", borderRadius:9, padding:"7px 11px" }}>
                      <i className="ti ti-map-pin" style={{ fontSize:13, color:"#059669" }} />
                      <div><div style={{ fontSize:10, color:"#059669" }}>Location</div><div style={{ fontSize:12, fontWeight:500, color:"#065f46" }}>{city}</div></div>
                    </span>
                  )}
                </div>
              </Card>

              {/* Pastor */}
              {pastor_name && (
                <Card icon="user" iconBg="#ccfbf1" iconColor="#0f766e" hdrBg="#f0fdfa" title="Senior Pastor">
                  <a href={`/pastor/${church.pastor_id}`} style={{ display:"flex", alignItems:"center", gap:10, background:"#f5f0ff", border:"0.5px solid #ddd6fe", borderRadius:9, padding:10, cursor:"pointer", textDecoration:"none" }}>
                    <div style={{ width:46, height:46, borderRadius:"50%", background:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <i className="ti ti-user" style={{ fontSize:22, color:"#fff" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:"#111" }}>{pastor_name}</div>
                      <div style={{ fontSize:11, color:"#7c3aed", marginTop:2 }}>Senior Pastor · {denomination}</div>
                    </div>
                    <i className="ti ti-arrow-right" style={{ fontSize:15, color:"#d1d5db" }} />
                  </a>
                </Card>
              )}

              {/* Service Times */}
              {services.length > 0 && (
                <Card icon="clock" iconBg="#bbf7d0" iconColor="#15803d" hdrBg="#f0fdf4" title="Service Times">
                  {services.map((s,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:i<services.length-1?"0.5px solid #e5e7eb":"none" }}>
                      <span style={{ minWidth:70, fontWeight:500, color:"#111", fontSize:12 }}>{s.day}</span>
                      <span style={{ flex:1, color:"#6b7280", fontSize:12 }}>{s.event_name}</span>
                      <span style={{ color:"#7c3aed", fontWeight:500, fontSize:11, background:"#f5f0ff", padding:"3px 8px", borderRadius:7 }}>{s.start_time} — {s.end_time}</span>
                    </div>
                  ))}
                </Card>
              )}

              {/* Worship Styles */}
              {worship_styles.length > 0 && (
                <Card icon="sparkles" iconBg="#fef08a" iconColor="#ca8a04" hdrBg="#fefce8" title="Worship Styles">
                  {worship_styles.map(w => <Tag key={w} label={w} bg="#fef9ec" color="#78350f" border="#fde68a" />)}
                </Card>
              )}

              {/* Ministries */}
              {ministries.length > 0 && (
                <Card icon="users" iconBg="#fecdd3" iconColor="#be123c" hdrBg="#fff1f2" title="Ministries & Outreach">
                  {ministries.map(m => <Tag key={m} label={m} bg="#fff1ee" color="#9f1239" border="#fecdc7" />)}
                </Card>
              )}

              {/* Languages */}
              {languages.length > 0 && (
                <Card icon="language" iconBg="#ccfbf1" iconColor="#0f766e" hdrBg="#f0fdfa" title="Languages Spoken">
                  {languages.map(l => <Tag key={l} label={l} bg="#e0f9f3" color="#065f46" border="#99f0d8" />)}
                </Card>
              )}

              {/* Gallery */}
              {gallery_images.length > 0 && (
                <Card icon="photo" iconBg="#bfdbfe" iconColor="#1d4ed8" hdrBg="#eff6ff" title="Gallery">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                    {gallery_images.slice(0,9).map((img,i) => (
                      <div key={i} style={{ aspectRatio:"4/3", borderRadius:8, overflow:"hidden" }}>
                        <img src={img} alt={`gallery ${i}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {activeTab === "team" && (
            <>
              {[
                { team: worship_team, label:"Worship Team", icon:"music", color:"#7c3aed", bg:"#f5f0ff" },
                { team: it_media_team, label:"IT & Media Team", icon:"device-tv", color:"#1d4ed8", bg:"#eff6ff" },
                { team: outreach_team, label:"Outreach Team", icon:"heart", color:"#059669", bg:"#f0fdf4" },
              ].map(({ team, label, icon, color, bg }) => team.images?.length > 0 && (
                <div key={label} style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
                  <div style={{ height:140, position:"relative", overflow:"hidden", background:"#1a0d3d" }}>
                    <img src={team.images[0]} alt={label} style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.7, display:"block" }} />
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.05) 65%)" }} />
                    <span style={{ position:"absolute", top:10, right:10, fontSize:11, fontWeight:500, padding:"3px 10px", borderRadius:10, background:`${color}30`, color:"#fff", border:`0.5px solid ${color}50` }}>{label}</span>
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
                        style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:500, padding:"5px 12px", borderRadius:16, cursor:"pointer", border:`0.5px solid ${color}30`, background:bg, color, textDecoration:"none", marginRight:6 }}>
                        <i className="ti ti-brand-youtube" style={{ fontSize:13 }} /> Watch Video {i+1}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* SIDEBAR */}
        <div>
          {/* Schedule */}
          {services.length > 0 && (
            <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
              <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#f0fdf4", borderBottom:"0.5px solid #bbf7d0" }}>
                <div style={{ width:28, height:28, borderRadius:7, background:"#bbf7d0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <i className="ti ti-clock" style={{ fontSize:15, color:"#15803d" }} />
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:"#15803d" }}>Service Schedule</span>
              </div>
              <div style={{ padding:"8px 14px 12px" }}>
                {services.map((s,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:i<services.length-1?"0.5px solid #e5e7eb":"none", fontSize:12 }}>
                    <span style={{ minWidth:60, fontWeight:500, color:"#111" }}>{s.day}</span>
                    <span style={{ flex:1, color:"#6b7280" }}>{s.event_name}</span>
                    <span style={{ color:"#7c3aed", fontWeight:500, fontSize:11, background:"#f5f0ff", padding:"3px 7px", borderRadius:7, whiteSpace:"nowrap" }}>{s.start_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
            <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#eff6ff", borderBottom:"0.5px solid #bfdbfe" }}>
              <div style={{ width:28, height:28, borderRadius:7, background:"#bfdbfe", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <i className="ti ti-map" style={{ fontSize:15, color:"#1d4ed8" }} />
              </div>
              <span style={{ fontSize:13, fontWeight:500, color:"#1d4ed8" }}>Location</span>
            </div>
            <div style={{ padding:"12px 14px" }}>
              <div style={{ height:110, background:"#eff6ff", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10, border:"0.5px solid #bfdbfe" }}>
                <i className="ti ti-map" style={{ fontSize:28, color:"#93c5fd" }} />
              </div>
              {address && <div style={{ fontSize:12, color:"#6b7280", display:"flex", alignItems:"center", gap:4, marginBottom:10 }}>
                <i className="ti ti-map-pin" style={{ fontSize:13, color:"#7c3aed" }} /> {address}
              </div>}
              {google_maps_link && (
                <a href={google_maps_link} target="_blank" rel="noreferrer"
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, background:"#7c3aed", color:"#fff", borderRadius:8, padding:8, fontSize:12, fontWeight:500, textDecoration:"none" }}>
                  <i className="ti ti-navigation" style={{ fontSize:14 }} /> Open in Google Maps
                </a>
              )}
            </div>
          </div>

          {/* Watch Live */}
          {youtube && (
            <div style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", marginBottom:10 }}>
              <div style={{ padding:"11px 14px 10px", display:"flex", alignItems:"center", gap:8, background:"#fff1f2", borderBottom:"0.5px solid #fecdd3" }}>
                <div style={{ width:28, height:28, borderRadius:7, background:"#fecdd3", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <i className="ti ti-brand-youtube" style={{ fontSize:15, color:"#be123c" }} />
                </div>
                <span style={{ fontSize:13, fontWeight:500, color:"#be123c" }}>Watch Live</span>
              </div>
              <div style={{ padding:"12px 14px" }}>
                <a href={youtube} target="_blank" rel="noreferrer" style={{ display:"block", textDecoration:"none" }}>
                  <div style={{ height:90, borderRadius:8, overflow:"hidden", position:"relative", cursor:"pointer", background:"#1a0d3d" }}>
                    {gallery_images[0] && <img src={gallery_images[0]} alt="video" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.6, display:"block" }} />}
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.9)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <i className="ti ti-player-play" style={{ fontSize:16, color:"#be123c", marginLeft:2 }} />
                      </div>
                    </div>
                  </div>
                </a>
                <div style={{ fontSize:11, color:"#6b7280", textAlign:"center", marginTop:7 }}>Watch our latest service on YouTube</div>
              </div>
            </div>
          )}

          {/* QR Pill */}
          <div style={{ background:"#f5f0ff", border:"0.5px solid #ddd6fe", borderRadius:12, padding:14, marginBottom:10, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:13, fontWeight:500, color:"#4c1d95", display:"flex", alignItems:"center", gap:6 }}>
              <i className="ti ti-qrcode" style={{ fontSize:15, color:"#7c3aed" }} /> Scan & Share
            </div>
            <div style={{ width:70, height:70, background:"#fff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", border:"0.5px solid #ddd6fe" }}>
              <i className="ti ti-qrcode" style={{ fontSize:36, color:"#c4b5fd" }} />
            </div>
            <div style={{ display:"flex", gap:6, width:"100%" }}>
              {["QR Code","PDF Card","Share"].map(b => (
                <button key={b} style={{ flex:1, background:"#fff", border:"0.5px solid #ddd6fe", borderRadius:7, padding:7, color:"#5b21b6", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>{b}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FULL WIDTH CONTACT */}
      <div ref={contactRef} style={{ background:"#fff", border:"0.5px solid #e5e7eb", borderRadius:12, overflow:"hidden", margin:"0 14px 14px" }}>
        <div style={{ padding:"13px 16px 11px", display:"flex", alignItems:"center", gap:10, background:"#faf5ff", borderBottom:"0.5px solid #ede9fe" }}>
          <div style={{ width:30, height:30, borderRadius:8, background:"#ede9fe", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <i className="ti ti-message" style={{ fontSize:16, color:"#7c3aed" }} />
          </div>
          <span style={{ fontSize:14, fontWeight:500, color:"#5b21b6" }}>Contact This Church</span>
          <span style={{ marginLeft:"auto", fontSize:12, color:"#6b7280" }}>We'll get back to you soon</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
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
              { icon:"map-pin", bg:"linear-gradient(135deg,#7c3aed,#a78bfa)", label:"Address", value:address },
              { icon:"phone", bg:"linear-gradient(135deg,#059669,#34d399)", label:"Phone", value:phone },
              { icon:"mail", bg:"linear-gradient(135deg,#1d4ed8,#60a5fa)", label:"Email", value:email },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:"0.5px solid #e5e7eb" }}>
                <div style={{ width:36, height:36, borderRadius:9, background:row.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <i className={`ti ti-${row.icon}`} style={{ fontSize:15, color:"#fff" }} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#6b7280" }}>{row.label}</div>
                  <div style={{ fontSize:13, color:"#111", wordBreak:"break-all" }}>{row.value}</div>
                </div>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
              {[
                { icon:"brand-facebook", bg:"linear-gradient(135deg,#1877f2,#42a5f5)", href:facebook },
                { icon:"brand-instagram", bg:"linear-gradient(135deg,#833ab4,#e1306c)", href:instagram },
                { icon:"brand-youtube", bg:"linear-gradient(135deg,#ff0000,#cc0000)", href:youtube },
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

      {/* FOOTER */}
      <div style={{ background:"#fff", borderTop:"0.5px solid #e5e7eb", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <span style={{ fontSize:12, color:"#9ca3af" }}>© 2026 ChurchNavigator</span>
        <div style={{ display:"flex", gap:16 }}>
          {["Privacy","Terms","Add your church"].map(l => (
            <span key={l} style={{ fontSize:12, color:"#9ca3af", cursor:"pointer" }}>{l}</span>
          ))}
        </div>
      </div>

    </div>
  );
}
