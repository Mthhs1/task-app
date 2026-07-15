"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import type { Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateUsernameSchema } from "@meu-projeto/types"
import type { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"

type FormData = z.infer<typeof updateUsernameSchema>

export default function SetupUsernamePage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(updateUsernameSchema) as unknown as Resolver<FormData>,
        defaultValues: { username: "" },
    })

    async function onSubmit(data: FormData) {
        setIsSubmitting(true)

        try {
            const res = await fetch("/api/user/username", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: data.username }),
            })

            if (!res.ok) {
                const json = await res.json()
                const message = json.message || "Falha ao atualizar nome de usuário"
                toast.error(message)
                setError("username", { message })
                return
            }

            toast.success("Nome de usuário atualizado!")
            router.push("/dashboard")
            router.refresh()
        } catch {
            toast.error("Erro ao atualizar nome de usuário")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle>Escolha um nome de usuário</CardTitle>
                    <CardDescription>
                        Escolha um nome de usuário para continuar
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field data-invalid={!!errors.username}>
                                <FieldLabel htmlFor="username">Nome de usuário</FieldLabel>
                                <Input
                                    id="username"
                                    {...register("username")}
                                    aria-invalid={!!errors.username}
                                    placeholder="john-doe"
                                />
                                {errors.username && (
                                    <FieldError errors={[errors.username]} />
                                )}
                            </Field>

                            {errors.root && (
                                <p
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {errors.root.message}
                                </p>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Salvando..." : "Salvar"}
                            </Button>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
