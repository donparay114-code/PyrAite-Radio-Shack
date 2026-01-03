import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

export function GoogleLoginBtn() {
    const { loginWithGoogle } = useAuth();

    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={credentialResponse => {
                    if (credentialResponse.credential) {
                        loginWithGoogle(credentialResponse.credential);
                    }
                }}
                onError={() => {
                    toast.error("Google login failed", {
                        description: "Please try again or use a different sign-in method",
                    });
                }}
                theme="filled_black"
                shape="pill"
                size="large"
                width="300"
            />
        </div>
    );
}
