"use client"

import { useForm } from "react-hook-form"
import z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { signIn } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import { Path } from "@/config/constants"

const loginSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginForm() {
    const router = useRouter()
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const onSubmit = async (values: LoginFormValues) => {
        // Handle login logic here
        await signIn.email(
            {
                email: values.email,
                password: values.password,
                callbackURL: Path.ADMIN_DASHBOARD,
            },
            {
                onSuccess: () => {
                    router.push(Path.ADMIN_DASHBOARD)
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message)
                },
            }
        )
    }

    const isPending = form.formState.isSubmitting

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>Login to continue</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="grid gap-6">
                                {/* <div className="flex flex-col gap-4">

                                    <Button
                                        variant={"outline"}
                                        className="w-full"
                                        type="button"
                                        disabled={isPending}
                                    >
                                        <Image
                                            src="/logos/google.svg"
                                            alt="Google Logo"
                                            width={20}
                                            height={20}
                                        />
                                        Continue with Google
                                    </Button>
                                </div> */}
                                <div className="grid gap-6">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="email"
                                                        placeholder="abc@example.com"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="*********"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        className="w-full"
                                        type="submit"
                                        disabled={isPending}
                                    >
                                        Login
                                    </Button>
                                </div>
                                <div className="text-center text-sm">
                                    Don&#39;t have an account?{" "}
                                    <Link
                                        href="/signup"
                                        className="underline underline-offset-4"
                                    >
                                        Sign up
                                    </Link>
                                </div>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}