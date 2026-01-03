
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/providers/AuthProvider";

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
                    // Login error handled by Google OAuth component
                }}
                theme="filled_black"
                shape="pill"
                size="large"
                width="300"
            />
        </div>
    );
}
