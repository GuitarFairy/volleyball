/** Future Worker/API boundary. Only trusted server middleware supplies session.
 * Never accept userId or teamId from a browser payload as proof of access.
 */
export function requireTeamSession(session, teamId) {
  if (!session?.userId) throw new Response('로그인이 필요합니다.', {status:401});
  if (!teamId || !session.teamIds?.includes(teamId))
    throw new Response('접근 권한이 없습니다.', {status:403});
  return {userId:session.userId,teamId};
}
/** Wrap each production data handler after cookie/session verification. */
export function protectedTeamHandler(resolveSession,resolveTeamId,handler) {
  return async (request,env,ctx)=>{
    try {
      const session=await resolveSession(request,env);
      const identity=requireTeamSession(session,await resolveTeamId(request,env));
      const response=await handler(request,env,ctx,identity);
      response.headers.set('Cache-Control','private, no-store');
      return response;
    } catch(error) {
      if(error instanceof Response)return error;
      throw error;
    }
  };
}
