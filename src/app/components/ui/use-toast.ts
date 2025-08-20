
function toast({ ...props }: Toast) {
  const id = genId()

  // Nova lógica para suprimir erros de Server Components render
  if (props.variant === "destructive" && 
      props.description && 
      typeof props.description === "string" && 
      (props.description.includes("Server Components render") || 
       props.description.includes("digest property") ||
       props.description.includes("Error in server action"))) {
    
    // Registrar o erro no console mas não mostrar o toast
    devLog.log("[TOAST SUPPRESSED] Erro de Server Components render:", props.description);
    
    // Retornar um objeto fake de toast que não mostra nada
    return {
      id: id,
      dismiss: () => {},
      update: () => {},
    }
  }

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
} 