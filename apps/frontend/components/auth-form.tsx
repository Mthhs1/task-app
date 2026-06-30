"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import type { Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signInSchema, signUpSchema } from "@meu-projeto/types"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"

interface AuthFormProps {
    mode: "login" | "signup"
}

type FormData = z.infer<typeof signUpSchema>

export function AuthForm({ mode }: AuthFormProps) {
    const router = useRouter()
    const isLogin = mode === "login"

    const schema = isLogin ? signInSchema : signUpSchema

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema) as unknown as Resolver<FormData>,
        defaultValues: { name: "", email: "", password: "" },
    })

    async function onSubmit(data: FormData) {
        const action = isLogin ? "sign-in-email" : "sign-up-email"

        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...data }),
        })

        if (!res.ok) {
            let message = "Ocorreu um erro inesperado"
            try {
                const json = await res.json()
                message = json.error?.message || json.message || message
            } catch {
                const text = await res.text()
                message = text || message
            }
            setError("root", { message })
            return
        }

        router.push("/")
        router.refresh()
    }

    async function handleGoogleSignIn() {
        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "sign-in-social",
                    provider: "google",
                    callbackURL: `${window.location.origin}/dashboard`,
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                console.error(json)
                return
            }

            const { url } = await res.json()
            if (url) {
                window.location.href = url
            }
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle>{isLogin ? "Entrar" : "Criar Conta"}</CardTitle>
                    <CardDescription>
                        {isLogin
                            ? "Entre com suas credenciais para acessar"
                            : "Preencha os dados para se cadastrar"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            {!isLogin && (
                                <Field data-invalid={!!errors.name}>
                                    <FieldLabel htmlFor="name">Nome</FieldLabel>
                                    <Input
                                        id="name"
                                        {...register("name")}
                                        aria-invalid={!!errors.name}
                                    />
                                    {errors.name && (
                                        <FieldError errors={[errors.name]} />
                                    )}
                                </Field>
                            )}

                            <Field data-invalid={!!errors.email}>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    {...register("email")}
                                    aria-invalid={!!errors.email}
                                />
                                {errors.email && (
                                    <FieldError errors={[errors.email]} />
                                )}
                            </Field>

                            <Field data-invalid={!!errors.password}>
                                <FieldLabel htmlFor="password">
                                    Senha
                                </FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    {...register("password")}
                                    aria-invalid={!!errors.password}
                                />
                                {errors.password && (
                                    <FieldError errors={[errors.password]} />
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
                                {isSubmitting
                                    ? "Carregando..."
                                    : isLogin
                                      ? "Entrar"
                                      : "Cadastrar"}
                            </Button>
                        </FieldGroup>
                    </form>

                    <div className="relative my-4">
                        <Separator />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                            ou
                        </span>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
                    >
                        <svg className="mr-2 size-4" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continuar com Google
                    </Button>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-muted-foreground">
                        {isLogin ? (
                            <>
                                Não tem conta?{" "}
                                <Link
                                    href="/signup"
                                    className="font-medium text-primary hover:underline"
                                >
                                    Cadastre-se
                                </Link>
                            </>
                        ) : (
                            <>
                                Já tem conta?{" "}
                                <Link
                                    href="/login"
                                    className="font-medium text-primary hover:underline"
                                >
                                    Entrar
                                </Link>
                            </>
                        )}
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
