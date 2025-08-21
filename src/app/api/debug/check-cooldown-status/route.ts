import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    
    // IDs dos nossos testes
    const adminUserId = '3a94ea97-85ce-49f1-b390-023a22c7975d';
    const clientUserId = '51eb1649-b2e0-4fd9-aa75-a44d4ba9388b';
    const projectId = '96e5a3ba-c812-474c-9e66-65fd8aabd8eb';
    
    // Buscar todos os cooldowns ativos
    const { data: cooldowns, error } = await supabase
      .from('email_cooldowns')
      .select('*')
      .or(`user_id.eq.${adminUserId},user_id.eq.${clientUserId}`)
      .eq('project_id', projectId);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        data: null
      });
    }
    
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
    
    const cooldownStatus = cooldowns?.map(cooldown => {
      const lastEmailTime = new Date(cooldown.last_email_sent_at);
      const isInCooldown = lastEmailTime > fiveMinutesAgo;
      const timeUntilNextEmail = isInCooldown 
        ? Math.ceil((lastEmailTime.getTime() + (5 * 60 * 1000) - now.getTime()) / 1000)
        : 0;
      
      return {
        ...cooldown,
        lastEmailTime: lastEmailTime.toISOString(),
        isInCooldown,
        timeUntilNextEmailSeconds: timeUntilNextEmail,
        minutesAgo: Math.floor((now.getTime() - lastEmailTime.getTime()) / (1000 * 60))
      };
    }) || [];
    
    return NextResponse.json({
      success: true,
      data: {
        currentTime: now.toISOString(),
        fiveMinutesAgo: fiveMinutesAgo.toISOString(),
        cooldowns: cooldownStatus,
        totalCooldowns: cooldowns?.length || 0,
        activeUsers: {
          admin: adminUserId,
          client: clientUserId,
          project: projectId
        }
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    });
  }
}
