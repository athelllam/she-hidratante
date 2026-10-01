const { requireAdmin, supabaseFetch } = require('../_lib/admin');
function json(res,s,b){res.status(s).json(b)}
module.exports = async function handler(req,res){
  try{
    await requireAdmin(req);
    if(req.method==='GET'){
      const rows=await supabaseFetch('/rest/v1/affiliate_withdrawals?select=*,affiliates(id,slug,name,email)&order=requested_at.desc');
      return json(res,200,{withdrawals:rows||[]});
    }
    if(req.method==='PATCH'){
      const {id,status,note}=req.body||{};
      if(!id || !['pending','approved','paid','rejected','cancelled'].includes(status)) return json(res,400,{error:'Dados inválidos.'});
      const rows=await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status,note:note||null,processed_at:['paid','rejected','cancelled'].includes(status)?new Date().toISOString():null})});
      return json(res,200,{withdrawal:rows?.[0]||null});
    }
    return json(res,405,{error:'Método não permitido.'})
  }catch(e){return json(res,e.statusCode||500,{error:e.message})}
}
