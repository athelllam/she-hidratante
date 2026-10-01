const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
module.exports = async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido.'});
  try{
    const {affiliate}=await requireAffiliate(req);
    const amount=Number(req.body?.amount);
    if(!Number.isFinite(amount)||amount<=0) return json(res,400,{error:'Valor de saque inválido.'});
    const orders=await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,commission`);
    const withdrawals=await supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${affiliate.id}&status=in.(pending,approved,paid)&select=amount`);
    const cancelled=new Set(['cancelled','canceled','refunded','chargeback','payment_refunded']);
    const earned=(orders||[]).filter(o=>!cancelled.has(String(o.status||'').toLowerCase())).reduce((s,o)=>s+Number(o.commission||0),0);
    const reserved=(withdrawals||[]).reduce((s,w)=>s+Number(w.amount||0),0);
    const available=earned-reserved;
    if(amount>available+0.001) return json(res,400,{error:'Saldo disponível insuficiente.',available});
    const rows=await supabaseFetch('/rest/v1/affiliate_withdrawals',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({affiliate_id:affiliate.id,amount,status:'pending'})});
    return json(res,201,{withdrawal:rows?.[0]});
  }catch(e){return json(res,e.statusCode||500,{error:e.message})}
}
