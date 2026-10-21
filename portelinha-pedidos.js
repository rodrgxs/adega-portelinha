/* Adega Portelinha — pedidos WhatsApp, horário e fotos referenciais.
 * Checkout sem servidor: pedido só é transmitido quando cliente confirma envio no WhatsApp.
 */
(() => {
  'use strict';
  const WHATSAPP = '5511952379321';
  const DELIVERY_FEE = 10;
  const MIN_ORDER = 10;  // valor dos produtos, sem frete
  const ZONE = 'America/Sao_Paulo';
  const money = value => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(value);
  const clean = value => String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ');

  // Fotos de referência encontradas em páginas de produtos com correspondência específica.
  // São hospedadas por terceiros e têm fallback local quando o servidor restringe acesso.
  // Para uso comercial definitivo, substituir por fotos próprias ou licenciadas e armazená-las localmente.
  const sourcedPhotos = {
    'Skol 269ml':'https://www.paodeacucar.com/img/uploads/1/326/33043326.jpg',
    'Spaten 350ML':'https://s3-sa-east-1.amazonaws.com/files-sc.sigecloud.com.br/Producao/34ef3c37-95cf-49f4-bcc8-41bce77d8188/ImagensProdutos/65582c5117243bc1ad8d7369_600x600.jpeg',
    'Itaipava 269ml':'https://assets.instabuy.app.br/ib.item.image.large/l-901a04c20da04fa19f89eb20133e24f0.jpeg',
    'Amstel 269ML':'https://www.paodeacucar.com/img/uploads/1/693/24095693.jpg',
    'Red Bull Tropical':'https://santaluciadrogaria.vtexassets.com/arquivos/ids/164463/9002490229160.png?v=637638162292970000',
    'Black White':'https://fortatacadista.vteximg.com.br/arquivos/ids/160789-800-800/BEB.WHISKY-IMP.BLACK-WHITE-1L---41475.jpg?v=637437438124400000',
    "Jack Daniel's 1L Honey":'https://carrefourbrfood.vtexassets.com/arquivos/ids/194169489/9517677_1.jpg?v=638894063029700000',
    'White Horse 1L':'https://assets.instabuy.app.br/ib.item.image.large/l-b27fc3feb8c541c1a48444c2d9618590.jpeg',
    'Ballantines 1L':'https://www.fiestapero.com/nouveausite/http%3A/www.fiestapero.com/img/Ballantines-1L.jpg'
  };
  const safeHtml = value => String(value).replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));

  // A fotografia deve corresponder ao SKU; para os demais itens manter o fallback existente.
  const oldArt = art;
  art = function(p, id='a') {
    const photo = sourcedPhotos[p.name];
    if (!photo) return oldArt(p, id);
    const fallback = oldArt(p, id);
    return `<img class="real-photo" src="${safeHtml(photo)}" alt="Foto de referência: ${safeHtml(p.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.outerHTML=decodeURIComponent(this.dataset.fallback)" data-fallback="${encodeURIComponent(fallback)}">`;
  };

  const style = document.createElement('style');
  style.textContent = `
    :root{--brand:#f4f4f4;--dark:#151515;--ink:#191919;--paper:#f8f8f8}
    .hero{background:#151515}.hero:before{background:#303030}.hero h1 em{color:#fff}
    .hero-tag,.hero-floating,.hero-bottom-tag{color:#eee}.hero-tag:before{background:#eee}
    .primary-btn{background:#fff;color:#101010}.primary-btn:hover{background:#e8e8e8}
    .cart-badge{background:#fff;color:#111}.cart-btn{background:#111}.cart-btn:hover{background:#333}
    .cat-card.active{background:#181818;border-color:#181818}.cat-card.active .cat-icon{background:#333}
    .top-dot{background:#eee}.announcement strong{color:#fff}
    .benefit-icon .icon{color:#111}.eyebrow{color:#555}
    .deal-banner{background:#efefef}.deal-banner:before{background:rgba(0,0,0,.05)}.deal-copy .overline{color:#444}.deal-copy p{color:#666}
    .store-info{background:#fff;border:1px solid #e9e9e9;border-radius:14px;margin:4px 0 12px;padding:14px 18px;display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap}
    .store-info b{font-size:12px}.store-info span{font-size:11px;color:#616161}.store-state{font-size:11px!important;font-weight:800}
    .store-state[data-open="true"]{color:#2b7344!important}.store-state[data-open="false"]{color:#945c28!important}
    .drawer-foot{max-height:50vh;overflow-y:auto}.drawer-foot .copy-btn{margin-top:6px}
    .checkout-start{border:0;background:#181818;color:white;border-radius:12px;padding:14px 16px;font-size:13px;font-weight:800;width:100%;margin:13px 0 3px;cursor:pointer}
    .checkout-start:disabled{background:#c6c6c6;cursor:not-allowed}.drawer-delivery{display:flex;justify-content:space-between;color:#535353;font-size:12px;padding:8px 0}
    .drawer-message{font-size:11px;line-height:1.45;color:#777;margin:8px 0}.checkout-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:220;display:none;align-items:center;justify-content:center;padding:15px}
    .checkout-backdrop.open{display:flex}.checkout-box{background:#fff;border-radius:18px;width:min(600px,100%);max-height:calc(100dvh - 30px);overflow:auto;padding:26px;box-shadow:0 15px 70px rgba(0,0,0,.25)}
    .checkout-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.checkout-head h2{margin:0;font:800 24px/1.1 Manrope,Arial,sans-serif;letter-spacing:-.8px}
    .checkout-head p{font-size:12px;color:#666;margin:5px 0 0}.checkout-x{border:1px solid #ddd;border-radius:10px;background:#fff;padding:6px 12px;font-size:20px;flex-shrink:0}
    .checkout-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.checkout-form label{font-size:11px;font-weight:800;color:#444;display:flex;flex-direction:column;gap:6px}
    .checkout-form input,.checkout-form select,.checkout-form textarea{height:43px;min-width:0;border:1px solid #d9d9d9;border-radius:10px;padding:9px 11px;background:#fff;color:#111;font-size:13px;outline-offset:1px}
    .checkout-form textarea{height:70px;resize:vertical}.checkout-form .full{grid-column:1/-1}.checkout-form .hidden{display:none}
    .checkout-delivery{display:flex;gap:12px;margin:4px 0 2px}.checkout-delivery label{flex:1;border:1px solid #ddd;border-radius:12px;padding:10px;display:flex;align-items:center;flex-direction:row;font-size:12px;cursor:pointer}
    .checkout-delivery input{width:16px;height:16px;margin:0}
    .checkout-recap{border-radius:11px;background:#f4f4f4;padding:14px;display:grid;gap:7px;font-size:12px}
    .checkout-recap>div{display:flex;justify-content:space-between;gap:15px}.checkout-recap .grand{font-size:17px;font-weight:900;border-top:1px solid #ddd;padding-top:8px;margin-top:3px}
    .checkout-note{font-size:11px;color:#686868;line-height:1.55}.checkout-hours{font-size:11px;color:#80562b;background:#fff8ed;border:1px solid #f0dfca;padding:11px;border-radius:10px}
    .checkout-error{font-size:12px;color:#a22b22;font-weight:800;min-height:16px}
    .checkout-submit{background:#181818;color:#fff;border:0;border-radius:12px;padding:14px 16px;width:100%;font-weight:800;font-size:14px;cursor:pointer}
    .checkout-submit:hover{background:#333}.checkout-submit:disabled{background:#ccc;cursor:not-allowed}
    .footer-cta{background:#181818}.footer-cta .primary-btn{background:#fff;color:#111}
    @media(max-width:600px){.checkout-box{padding:19px;max-height:calc(100dvh - 20px)}.checkout-form{gap:9px}.checkout-form .mobile-full{grid-column:1/-1}.checkout-head h2{font-size:20px}}
  `;
  document.head.appendChild(style);

  // Horários em São Paulo, independentemente do fuso do navegador do cliente.
  const week = {'Sun':0,'Mon':1,'Tue':2,'Wed':3,'Thu':4,'Fri':5,'Sat':6};
  function shopClock(now=new Date()) {
    const parts=new Intl.DateTimeFormat('en-US', {timeZone:ZONE, weekday:'short', hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
    const grab=type=>parts.find(p=>p.type===type)?.value;
    const day=week[grab('weekday')];
    const minutes=Number(grab('hour'))*60+Number(grab('minute'));
    const end=day===0?16*60:day===5||day===6?21*60:20*60;
    return {day,minutes,isOpen:minutes>=480&&minutes<end,end};
  }
  function nextHoursText(clock) {
    if (clock.isOpen) return `Aberto agora · fecha às ${clock.end===960?'16h':clock.end===1260?'21h':'20h'}`;
    if (clock.minutes<480) return 'Fora do horário · abre hoje às 08h';
    return 'Fora do horário · abre amanhã às 08h';
  }
  function updateShopStatus() {
    const clock=shopClock();
    const state=document.getElementById('portelinhaStoreState');
    if (state) { state.textContent=nextHoursText(clock);state.dataset.open=String(clock.isOpen); }
    const checkoutHours=document.getElementById('checkoutHours');
    if(checkoutHours) {
      checkoutHours.hidden=clock.isOpen;
      checkoutHours.textContent='A loja está fora do horário de atendimento. Você ainda pode enviar a mensagem, mas o pedido só poderá ser confirmado no próximo expediente.';
    }
  }

  const benefits=document.querySelector('.benefits');
  if (benefits) benefits.insertAdjacentHTML('afterend', `<div class="store-info" aria-label="Horários de funcionamento"><div><b>Horário da Adega Portelinha</b><br><span>Seg–Qui: 08h–20h · Sex–Sáb: 08h–21h · Dom: 08h–16h</span></div><span class="store-state" id="portelinhaStoreState" aria-live="polite"></span></div>`);

  const foot=document.querySelector('#cartDrawer .drawer-foot');
  foot.querySelector('p').textContent='Pedidos pelo WhatsApp, sujeitos à confirmação da adega. Frete fixo R$ 10 para delivery; retirada gratuita.';
  foot.insertAdjacentHTML('afterbegin', `<div class="drawer-delivery"><span>Entrega</span><strong>R$ 10,00 no delivery</strong></div><button id="checkoutStart" class="checkout-start" type="button" disabled>Finalizar pedido pelo WhatsApp</button><div class="drawer-message">Pedido mínimo: R$ 10,00 em produtos. Pagamento combinado diretamente com a adega.</div>`);

  document.body.insertAdjacentHTML('beforeend', `
  <div class="checkout-backdrop" id="checkoutBackdrop" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle" aria-hidden="true">
    <div class="checkout-box">
      <div class="checkout-head"><div><h2 id="checkoutTitle">Finalizar pedido</h2><p>Confira os dados antes de abrir o WhatsApp.</p></div><button class="checkout-x" id="checkoutClose" type="button" aria-label="Fechar pedido">×</button></div>
      <form id="checkoutForm" class="checkout-form" novalidate>
        <fieldset class="full" style="border:0;padding:0;margin:0"><legend style="font-size:12px;font-weight:800;margin-bottom:6px">Recebimento</legend>
          <div class="checkout-delivery"><label><input type="radio" name="fulfillment" value="delivery" checked> Delivery (+ R$ 10)</label><label><input type="radio" name="fulfillment" value="pickup"> Retirada (grátis)</label></div>
        </fieldset>
        <label class="full">Seu nome *<input id="checkoutName" name="name" autocomplete="name" maxlength="90" placeholder="Nome e sobrenome" required></label>
        <label class="full">WhatsApp para contato *<input id="checkoutPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="21" placeholder="(11) 99999-9999" required></label>
        <label class="delivery-field">Cidade *<input id="checkoutCity" name="city" maxlength="70" autocomplete="address-level2" placeholder="Cidade" required></label>
        <label class="delivery-field">Bairro *<input id="checkoutDistrict" name="district" maxlength="80" autocomplete="address-level3" placeholder="Bairro" required></label>
        <label class="full delivery-field">Rua / Avenida *<input id="checkoutStreet" name="street" maxlength="110" autocomplete="address-line1" placeholder="Rua, avenida ou condomínio" required></label>
        <label class="delivery-field">Número *<input id="checkoutNumber" name="number" maxlength="12" placeholder="Número ou S/N" required></label>
        <label class="delivery-field">Complemento<input id="checkoutExtra" name="extra" maxlength="80" autocomplete="address-line2" placeholder="Bloco, apto, referência"></label>
        <label class="full">Forma de pagamento *<select id="checkoutPayment" name="payment" required><option value="">Selecione</option><option value="Pix">Pix</option><option value="Dinheiro">Dinheiro</option><option value="Cartão de débito">Cartão de débito</option><option value="Cartão de crédito">Cartão de crédito</option><option value="Cartão na entrega">Cartão na entrega</option></select></label>
        <label class="full hidden" id="checkoutChangeWrap">Precisa de troco para quanto? <input id="checkoutChange" name="change" inputmode="decimal" placeholder="Ex.: 100,00" maxlength="14"></label>
        <label class="full">Observações<textarea name="notes" id="checkoutNotes" maxlength="350" placeholder="Detalhes do pedido, preferências, ponto de referência..."></textarea></label>
        <div class="checkout-recap full" id="checkoutRecap" aria-live="polite"></div>
        <div class="checkout-hours full" id="checkoutHours" hidden></div>
        <div class="checkout-note full">O WhatsApp abrirá com o pedido preenchido. Para concluir, o cliente precisa apertar <b>Enviar</b> na conversa. Estoque, pagamento, frete e disponibilidade são confirmados pela adega. Produtos restritos apenas para maiores de 18 anos, com verificação de idade no atendimento e na entrega.</div>
        <div class="checkout-error full" id="checkoutError" role="alert" aria-live="assertive"></div>
        <button class="checkout-submit full" id="checkoutSubmit" type="submit">Continuar para o WhatsApp →</button>
      </form>
    </div>
  </div>`);

  const form=document.getElementById('checkoutForm');
  const backdrop=document.getElementById('checkoutBackdrop');
  const close=()=>{backdrop.classList.remove('open');backdrop.setAttribute('aria-hidden','true');document.body.style.overflow='';};
  function receiveMode(){return form.elements.fulfillment.value;}
  function subtotal() {return Object.entries(cart).reduce((sum,[id,qty])=>sum+(byId(id)?.price||0)*qty,0);}
  function recalc(){
    const delivery=receiveMode()==='delivery';
    const sub=subtotal(),fee=delivery?DELIVERY_FEE:0;
    document.getElementById('checkoutRecap').innerHTML=`<div><span>Produtos</span><b>${money(sub)}</b></div><div><span>${delivery?'Taxa de entrega':'Retirada'}</span><b>${money(fee)}</b></div><div class="grand"><span>Total estimado</span><span>${money(sub+fee)}</span></div>`;
    document.querySelectorAll('.delivery-field').forEach(el=>{ el.classList.toggle('hidden',!delivery);el.querySelector('input').required=delivery; });
    document.getElementById('checkoutChangeWrap').classList.toggle('hidden',form.elements.payment.value!=='Dinheiro');
    updateShopStatus();
  }
  function updateCheckoutStart(){
    const el=document.getElementById('checkoutStart');
    if(!el)return;
    const sub=subtotal();el.disabled=sub<MIN_ORDER;
    el.textContent=sub<MIN_ORDER ? `Pedido mínimo de ${money(MIN_ORDER)} em produtos` : 'Finalizar pedido pelo WhatsApp';
  }
  const origRenderCart=renderCart;
  renderCart=function(){origRenderCart();updateCheckoutStart();};
  updateCheckoutStart();
  try{renderProducts();renderCart();}catch(err){console.warn('Imagens ou carrinho não atualizados',err);}

  document.getElementById('checkoutStart').addEventListener('click',()=>{
    if(subtotal()<MIN_ORDER) return;
    closePanels();
    recalc();
    document.getElementById('checkoutError').textContent='';
    backdrop.classList.add('open');backdrop.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    document.getElementById('checkoutName').focus();
  });
  document.getElementById('checkoutClose').addEventListener('click',close);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&backdrop.classList.contains('open')){e.stopImmediatePropagation();close();}},true);
  form.querySelectorAll('[name="fulfillment"]').forEach(x=>x.addEventListener('change',recalc));
  form.elements.payment.addEventListener('change',recalc);

  function validate(){
    if(subtotal()<MIN_ORDER) return `O pedido mínimo é ${money(MIN_ORDER)} em produtos.`;
    const name=clean(form.elements.name.value);
    const phone=clean(form.elements.phone.value).replace(/\D/g,'');
    if(name.length<2) return 'Informe seu nome.';
    if(!/^\d{10,11}$/.test(phone)) return 'Informe um WhatsApp válido, com DDD (10 ou 11 dígitos).';
    if(receiveMode()==='delivery'){
      for(const [key,label] of [['city','cidade'],['district','bairro'],['street','rua'],['number','número']]){
        if(!clean(form.elements[key].value))return `Informe ${label} para a entrega.`;
      }
    }
    if(!clean(form.elements.payment.value)) return 'Escolha uma forma de pagamento.';
    if(form.elements.payment.value==='Dinheiro'&&clean(form.elements.change.value)){
      const change=Number(form.elements.change.value.replace(/\./g,'').replace(',','.'));
      if(!Number.isFinite(change)||change<(subtotal()+(receiveMode()==='delivery'?DELIVERY_FEE:0))) return 'O valor para troco precisa cobrir o total do pedido.';
    }
    return '';
  }
  function orderMessage(){
    const delivery=receiveMode()==='delivery', sub=subtotal(), fee=delivery?DELIVERY_FEE:0;
    const chunks=['*ADEGA PORTELINHA — NOVO PEDIDO*','',`*Cliente:* ${clean(form.elements.name.value)}`,`*WhatsApp:* ${clean(form.elements.phone.value)}`,`*Recebimento:* ${delivery?'Delivery':'Retirada na loja'}`];
    if(delivery){chunks.push(`*Endereço:* ${clean(form.elements.street.value)}, ${clean(form.elements.number.value)}`,`*Bairro:* ${clean(form.elements.district.value)}`,`*Cidade:* ${clean(form.elements.city.value)}`);if(clean(form.elements.extra.value))chunks.push(`*Complemento:* ${clean(form.elements.extra.value)}`);}
    chunks.push('', '*ITENS:*');
    for (const [id,qty] of Object.entries(cart)) {
      const p=byId(id);if(!p)continue;
      chunks.push(`• ${qty}x ${clean(p.name)} — ${money(p.price*qty)}`);
    }
    chunks.push('',`*Subtotal:* ${money(sub)}`,`*Entrega:* ${delivery?money(fee):'Grátis (retirada)'}`,`*Total estimado:* ${money(sub+fee)}`,`*Pagamento:* ${clean(form.elements.payment.value)}`);
    if(form.elements.payment.value==='Dinheiro'&&clean(form.elements.change.value))chunks.push(`*Troco para:* R$ ${clean(form.elements.change.value)}`);
    if(clean(form.elements.notes.value))chunks.push(`*Observações:* ${clean(form.elements.notes.value)}`);
    if(!shopClock().isOpen)chunks.push('', '⚠️ Pedido enviado fora do horário de funcionamento — aguardar retorno no próximo expediente.');
    chunks.push('','*Pedido sujeito à confirmação de estoque, entrega e idade (18+).*');
    return chunks.join('\n');
  }
  form.addEventListener('submit',ev=>{
    ev.preventDefault();
    const error=validate();
    document.getElementById('checkoutError').textContent=error;
    if(error)return;
    const url=`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(orderMessage())}`;
    // Navegar apenas depois do clique explícito para que o navegador não bloqueie.
    window.location.assign(url);
  });
  updateShopStatus();
})();
