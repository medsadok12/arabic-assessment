import{resolveActiveIdentity}from'./active-child';
import{questBalance}from'./picture-quest-server';
import{loadQuestBank,bankCatalog,readBankCatalog}from'./picture-quest-bank-server';

// Authentication stays with the caller. Identity is checked on every request;
// this result is never shared between accounts or cached on the server.
export async function loadTopicCatalog(admin,auth,req){
 const[live,{effectiveUserId}]=await Promise.all([loadQuestBank(admin),resolveActiveIdentity(auth.user,admin,req)]);
 const[catalog,points]=await Promise.all([auth.staff?bankCatalog(live.config):readBankCatalog(admin,auth,effectiveUserId,live.config),auth.staff?0:questBalance(admin,effectiveUserId)]);
 return{...catalog,points,staff:auth.staff};
}
