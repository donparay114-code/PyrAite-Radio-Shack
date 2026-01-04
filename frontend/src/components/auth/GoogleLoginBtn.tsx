
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/providers/AuthProvider";


interface GoogleLoginBtnProps {
    onLoginSuccess?: (isNewUser?: boolean) => void;
    onLoginError?: (error: string) => void;
}

export function GoogleLoginBtn({ onLoginSuccess, onLoginError }: GoogleLoginBtnProps) {
    const { loginWithGoogle } = useAuth();

    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                        const result = await loginWithGoogle(credentialResponse.credential);
                        if (result.success) {
                            onLoginSuccess?.(result.isNewUser);
                        } else {
                            onLoginError?.(result.error || "Google login failed");
                        }
                    }
                }}
                onError={() => {
                    onLoginError?.("Google authentication was cancelled or failed");
                }}
                theme="filled_black"
                shape="pill"
                size="large"
                width="300"
            />
        </div>
    );
}
