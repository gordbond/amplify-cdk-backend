## [Start] Determine request authentication mode **
#if( $util.isNullOrEmpty($authMode) && !$util.isNull($ctx.identity) && !$util.isNull($ctx.identity.sub) && !$util.isNull($ctx.identity.issuer) && !$util.isNull($ctx.identity.username) && !$util.isNull($ctx.identity.claims) && !$util.isNull($ctx.identity.sourceIp) && !$util.isNull($ctx.identity.defaultAuthStrategy) )
  #set( $authMode = "userPools" )
#end
## [End] Determine request authentication mode **
## [Start] Check authMode and execute owner/group checks **
#if( $authMode == "userPools" )
  ## [Start] Static Group Authorization Checks **
  #set($isStaticGroupAuthorized = $util.defaultIfNull(
            $isStaticGroupAuthorized, false))
  ## Authorization rule: { allow: groups, groups: ["Admin","ElevatorCompany","BuildingManager","Guest"], groupClaim: "cognito:groups" } **
  #set( $userGroups = $util.defaultIfNull($ctx.identity.claims.get("cognito:groups"), []) )
  #set( $allowedGroups = ["Admin", "ElevatorCompany", "BuildingManager", "Guest"] )
  #foreach( $userGroup in $userGroups )
    #if( $allowedGroups.contains($userGroup) )
      #set( $isStaticGroupAuthorized = true )
      #break
    #end
  #end
  ## [End] Static Group Authorization Checks **


  ## [Start] If not static group authorized, filter items **
  #if( !$isStaticGroupAuthorized )
    #set( $items = [] )
    #foreach( $item in $ctx.result.items )
      ## No Dynamic Group Authorization Rules **


      ## No Owner Authorization Rules **


      #if( ($isLocalDynamicGroupAuthorized == true || $isLocalOwnerAuthorized == true) )
        $util.qr($items.add($item))
      #end
    #end
    #set( $ctx.result.items = $items )
  #end
  ## [End] If not static group authorized, filter items **
#end
## [End] Check authMode and execute owner/group checks **

#if( $ctx.error )
$util.error($ctx.error.message, $ctx.error.type)
#else
$util.toJson($ctx.result)
#end