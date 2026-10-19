/** Public embed script. No secrets — installation key identifies the tenant only. */
export function createPublicWidgetScript(apiBase: string, publicKey: string) {
  const base = JSON.stringify(apiBase.replace(/\/$/, ''));
  const key = JSON.stringify(publicKey);
  return `(function(){
var API=${base};
var KEY=${key};
if(!KEY){console.warn("Relay widget missing installation key");return;}
if(window.__relayWidgetLoaded)return;window.__relayWidgetLoaded=true;
function uuid(){
  if(crypto.randomUUID)return crypto.randomUUID();
  var b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;
  var h=Array.from(b,function(x){return x.toString(16).padStart(2,"0");}).join("");
  return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);
}
function el(tag,attrs,children){
  var node=document.createElement(tag);
  if(attrs)Object.keys(attrs).forEach(function(k){
    if(k==="style"&&typeof attrs[k]==="object")Object.assign(node.style,attrs[k]);
    else if(k==="text")node.textContent=attrs[k];
    else if(k.slice(0,2)==="on"&&typeof attrs[k]==="function")node.addEventListener(k.slice(2).toLowerCase(),attrs[k]);
    else if(attrs[k]!=null)node.setAttribute(k,attrs[k]);
  });
  (children||[]).forEach(function(child){if(child)node.appendChild(child);});
  return node;
}
var state={token:null,employee:"Assistant",available:false,open:false,busy:false};
var panel,messages,composer,status,leadForm;
async function api(path,options){
  var res=await fetch(API+path,Object.assign({credentials:"omit"},options||{}));
  var data=null;try{data=await res.json();}catch(e){data=null;}
  if(!res.ok)throw new Error((data&&data.error)||"Request failed");
  return data;
}
function addBubble(role,text){
  messages.appendChild(el("div",{style:{
    alignSelf:role==="visitor"?"flex-end":"flex-start",
    background:role==="visitor"?"#1f3d2d":"#eef3e9",
    color:role==="visitor"?"#fff":"#142418",
    borderRadius:"14px",padding:"10px 12px",maxWidth:"85%",fontSize:"14px",
    whiteSpace:"pre-wrap",wordBreak:"break-word",margin:"4px 0"
  },text:text}));
  messages.scrollTop=messages.scrollHeight;
}
function setStatus(text){status.textContent=text||"";}
async function ensureSession(){
  if(state.token)return;
  var boot=await api("/api/widget/bootstrap?key="+encodeURIComponent(KEY));
  state.employee=boot.employeeName||"Assistant";
  state.available=!!boot.available;
  if(!boot.available){setStatus("Chat replies are temporarily unavailable.");}
  var session=await api("/api/widget/session?key="+encodeURIComponent(KEY),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:KEY})});
  state.token=session.token;
}
async function sendMessage(text){
  if(state.busy||!text)return;
  state.busy=true;setStatus("");
  addBubble("visitor",text);
  try{
    await ensureSession();
    if(!state.available){addBubble("employee","Chat replies are temporarily unavailable. You can still leave your contact details.");return;}
    var reply=await api("/api/widget/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+state.token},
      body:JSON.stringify({message:text,requestId:uuid()})
    });
    addBubble("employee",reply.answer||"");
  }catch(err){
    setStatus(err.message||"Could not send your message.");
  }finally{state.busy=false;}
}
async function sendLead(payload){
  if(state.busy)return;
  state.busy=true;setStatus("");
  try{
    await ensureSession();
    await api("/api/widget/lead",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+state.token},
      body:JSON.stringify(Object.assign({requestId:uuid(),consent:true},payload))
    });
    setStatus("Thanks — your details were shared with the business.");
    leadForm.reset();
  }catch(err){setStatus(err.message||"Could not save your contact details.");}
  finally{state.busy=false;}
}
function mount(){
  var root=el("div",{id:"relay-sales-widget",style:{position:"fixed",right:"20px",bottom:"20px",zIndex:"2147483000",fontFamily:"ui-sans-serif,system-ui,sans-serif"}});
  var toggle=el("button",{type:"button",style:{
    border:"0",borderRadius:"999px",background:"#1f3d2d",color:"#fff",padding:"14px 18px",
    boxShadow:"0 10px 30px rgba(20,36,24,.25)",cursor:"pointer",fontWeight:"600"
  },text:"Chat",onclick:function(){state.open=!state.open;panel.style.display=state.open?"flex":"none";}});
  panel=el("div",{style:{
    display:"none",flexDirection:"column",width:"min(360px,calc(100vw - 24px))",height:"480px",
    background:"#fff",border:"1px solid #d7ddd4",borderRadius:"18px",overflow:"hidden",
    marginBottom:"12px",boxShadow:"0 18px 50px rgba(20,36,24,.18)"
  }});
  var header=el("div",{style:{padding:"14px 16px",background:"#1f3d2d",color:"#fff"}},[
    el("div",{style:{fontWeight:"700",text:"Website chat"}}),
    el("div",{style:{fontSize:"12px",opacity:".85",marginTop:"4px",text:"Ask a question or leave your details."}})
  ]);
  messages=el("div",{style:{flex:"1",overflow:"auto",padding:"12px",display:"flex",flexDirection:"column",background:"#f7f8f4"}});
  status=el("div",{role:"status",style:{minHeight:"18px",padding:"0 12px",fontSize:"12px",color:"#5b675d"}});
  composer=el("form",{style:{display:"flex",gap:"8px",padding:"12px",borderTop:"1px solid #e4e8e1"}},[
    el("input",{type:"text",name:"message",placeholder:"Ask a question",maxLength:"2000",required:"required",style:{flex:"1",border:"1px solid #cfd6cb",borderRadius:"10px",padding:"10px",fontSize:"14px"}}),
    el("button",{type:"submit",style:{border:"0",borderRadius:"10px",background:"#1f3d2d",color:"#fff",padding:"0 14px",fontWeight:"600"},text:"Send"})
  ]);
  composer.addEventListener("submit",function(event){
    event.preventDefault();
    var field=composer.querySelector('input[name="message"]');
    var value=(field&&field.value||"").trim();
    if(field)field.value="";
    sendMessage(value);
  });
  leadForm=el("form",{style:{padding:"0 12px 12px",display:"grid",gap:"8px",borderTop:"1px solid #e4e8e1"}},[
    el("div",{style:{fontSize:"12px",fontWeight:"600",paddingTop:"10px",text:"Share contact details"}}),
    el("input",{name:"name",placeholder:"Your name",required:"required",maxLength:"80",style:{border:"1px solid #cfd6cb",borderRadius:"10px",padding:"8px 10px",fontSize:"13px"}}),
    el("input",{name:"email",type:"email",placeholder:"Email",required:"required",maxLength:"254",style:{border:"1px solid #cfd6cb",borderRadius:"10px",padding:"8px 10px",fontSize:"13px"}}),
    el("input",{name:"phone",placeholder:"Phone (optional)",maxLength:"40",style:{border:"1px solid #cfd6cb",borderRadius:"10px",padding:"8px 10px",fontSize:"13px"}}),
    el("label",{style:{fontSize:"12px",display:"flex",gap:"8px",alignItems:"flex-start"}},[
      el("input",{type:"checkbox",name:"consent",required:"required",style:{marginTop:"2px"}}),
      el("span",{text:"I consent to be contacted about this inquiry."})
    ]),
    el("button",{type:"submit",style:{border:"0",borderRadius:"10px",background:"#e0e9df",color:"#1f3d2d",padding:"10px",fontWeight:"600"},text:"Send contact details"})
  ]);
  leadForm.addEventListener("submit",function(event){
    event.preventDefault();
    var data=new FormData(leadForm);
    if(!data.get("consent")){setStatus("Consent is required to share your details.");return;}
    sendLead({name:String(data.get("name")||""),email:String(data.get("email")||""),phone:String(data.get("phone")||"")||undefined});
  });
  panel.appendChild(header);panel.appendChild(messages);panel.appendChild(status);panel.appendChild(composer);panel.appendChild(leadForm);
  root.appendChild(panel);root.appendChild(toggle);document.body.appendChild(root);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();`;
}
