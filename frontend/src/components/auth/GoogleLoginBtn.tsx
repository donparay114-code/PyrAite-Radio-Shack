
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/providers/AuthProvider";


interface GoogleLoginBtnProps {
    onLoginSuccess?: (isNewUser?: boolean) => void;
}

export function GoogleLoginBtn({ onLoginSuccess }: GoogleLoginBtnProps) {
    const { loginWithGoogle } = useAuth();

    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                        const result = await loginWithGoogle(credentialResponse.credential);
                        if (result.success && onLoginSuccess) {
                            onLoginSuccess(result.isNewUser);
                        }
                    }
                }}
                onError={() => {
                    console.log('Login Failed');
                }}
                theme="filled_black"
                shape="pill"
                size="large"
                width="300"
            />
        </div>
    );
}
