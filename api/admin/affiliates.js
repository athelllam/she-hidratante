const { requireAdmin, supabaseFetch } = require('../_lib/admin');
function json(res,s,b){res.status(s).json(b)}
module.exports = async function handler(req,res){
  try{
    await requireAdmin(req);
    if(req.method==='GET'){
      const rows=await supabaseFetch('/rest/v1/affiliates?select=id,slug,name,email,active,commission_rate,created_at&order=created_at.desc');
      return json(res,200,{affiliates:rows||[]});
    }
    if(req.method==='PATCH'){
      const {id,active,commissionRate}=req.body||{};
      if(!id) return json(res,400,{error:'ID obrigatório.'});
      const patch={};
      if(typeof active==='boolean') patch.active=active;
      if(commissionRate!=null) patch.commission_rate=Number(commissionRate);
      const rows=await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
      return json(res,200,{affiliate:rows?.[0]||null});
    }
    return json(res,405,{error:'Método não permitido.'});
  }catch(e){return json(res,e.statusCode||500,{error:e.message})}
}
