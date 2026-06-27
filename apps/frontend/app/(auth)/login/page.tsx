import { AuthForm } from "@/components/auth-form"
import { LandingHeader } from "@/components/landing-header"

export default function LoginPage() {
    return (
        <>
            <LandingHeader />
            <AuthForm mode="login" />
        </>
    )
}
