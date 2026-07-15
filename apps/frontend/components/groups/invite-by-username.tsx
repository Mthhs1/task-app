"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import type { Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { inviteByUsernameSchema } from "@meu-projeto/types"
import type { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"

interface InviteByUsernameProps {
    groupId: string
}

type FormData = z.infer<typeof inviteByUsernameSchema>

export function InviteByUsername({ groupId }: InviteByUsernameProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(inviteByUsernameSchema) as unknown as Resolver<FormData>,
        defaultValues: { username: "" },
    })

    async function onSubmit(data: FormData) {
        setIsSubmitting(true)

        try {
            const res = await fetch(`/api/groups/${groupId}/invite-by-username`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: data.username }),
            })

            if (!res.ok) {
                const json = await res.json()
                const message = json.message || "Falha ao enviar convite"
                toast.error(message)
                setError("username", { message })
                return
            }

            toast.success("Convite enviado com sucesso!")
            reset()
        } catch {
            toast.error("Erro ao enviar convite")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
                <Field data-invalid={!!errors.username}>
                    <FieldLabel htmlFor="username">Nome de usuário</FieldLabel>
                    <Input
                        id="username"
                        {...register("username")}
                        aria-invalid={!!errors.username}
                        placeholder="Digite o nome de usuário"
                    />
                    {errors.username && (
                        <FieldError errors={[errors.username]} />
                    )}
                </Field>

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Enviar convite"}
                </Button>
            </FieldGroup>
        </form>
    )
}
