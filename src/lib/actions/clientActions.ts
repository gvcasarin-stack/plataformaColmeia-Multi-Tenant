'use server';

import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";
import { getErrorMessage } from '@/lib/utils/errorUtils';

// Interface para os detalhes que vêm do formulário e precisam ser atualizados
interface ClientProfileDetailsData {
    userId: string; // ID do usuário de auth.users
    phone?: string | null;
    isCompany?: boolean;       // Assumindo que este campo sempre virá do formulário (true/false)
    companyName?: string | null;
    cnpj?: string | null;
    cpf?: string | null;
}

/**
 * Updates a client's profile in the 'users' table with additional details from the registration form.
 * This action is intended to be called after a user successfully signs up and the 
 * handle_new_user trigger has already created the basic profile entry.
 * It uses the Supabase service role client for elevated privileges.
 * 
 * @param data - The client profile details to update.
 * @returns An object with an error property if an error occurred, or null otherwise.
 */
export async function updateClientProfileDetails(data: ClientProfileDetailsData) {
    devLog.log('[updateClientProfileDetails] Received data for update:', data);
    const supabaseAdmin = createSupabaseServiceRoleClient();

    // Construir o objeto apenas com os campos que efetivamente têm valores para atualizar.
    // O id (data.userId) será usado na cláusula .eq() para encontrar o registro.
    const profileDetailsToUpdate: Partial<{
        phone: string | null;
        is_company: boolean;
        company_name: string | null;
        cnpj: string | null;
        cpf: string | null;
    }> = {};

    if (data.phone !== undefined) profileDetailsToUpdate.phone = data.phone;
    if (data.isCompany !== undefined) profileDetailsToUpdate.is_company = data.isCompany;
    // Para campos opcionais que dependem de isCompany, só adicione se isCompany for true e o valor existir
    if (data.isCompany) {
        if (data.companyName !== undefined) profileDetailsToUpdate.company_name = data.companyName;
        if (data.cnpj !== undefined) profileDetailsToUpdate.cnpj = data.cnpj;
        // CPF é para isIndividual, então só deve ser setado se não for company, ou explicitamente se for o caso
        // Se isCompany=true, cpf deve ser null (ou não incluído se a lógica do form já garante isso)
        // Assumindo que se isCompany é true, cpf não é relevante para este update ou será null.
        if (data.cpf !== undefined && !data.isCompany) { // Apenas se não for empresa e CPF for fornecido
             profileDetailsToUpdate.cpf = data.cpf;
        } else if (data.isCompany) {
            profileDetailsToUpdate.cpf = null; // Explicitamente anular CPF se for empresa
        }
    } else { // isIndividual (ou nenhum dos dois, mas o form deve validar isso)
        if (data.cpf !== undefined) profileDetailsToUpdate.cpf = data.cpf;
        // Se for pessoa física, companyName e cnpj devem ser null
        profileDetailsToUpdate.company_name = null;
        profileDetailsToUpdate.cnpj = null;
    }

    // Se nenhum campo precisa ser atualizado (além de id, que é para a condição)
    // Isso pode acontecer se o formulário não tiver campos além dos básicos tratados pelo trigger.
    const updateKeys = Object.keys(profileDetailsToUpdate);
    if (updateKeys.length === 0) {
        devLog.log('[updateClientProfileDetails] No specific details to update for user:', data.userId, '(Trigger might have handled all necessary fields or form was minimal)');
        return { error: null }; 
    }

    devLog.log('[updateClientProfileDetails] Attempting to update profile for user:', data.userId, 'with details:', profileDetailsToUpdate);

    const { error } = await supabaseAdmin
        .from('users') // Sua tabela public.users
        .update(profileDetailsToUpdate)
        .eq('id', data.userId); // Condição para encontrar o registro a ser atualizado

    if (error) {
        devLog.error('[updateClientProfileDetails] Error updating client profile details in Supabase:', error);
        return { error: { message: getErrorMessage(error), details: error.message } };
    }

    devLog.log('[updateClientProfileDetails] Client profile details updated successfully for user:', data.userId);
    return { error: null };
} 