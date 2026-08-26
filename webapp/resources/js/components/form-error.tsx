type FormErrorProps = {
    message?: string;
};

export function FormError({ message }: FormErrorProps) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-xs text-red-700">{message}</p>;
}
