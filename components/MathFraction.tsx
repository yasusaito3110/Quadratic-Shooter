import React from 'react';

interface FractionProps {
    value: string;
}

export const MathFraction: React.FC<FractionProps> = ({ value }) => {
    if (!value || value === "?") return <span>?</span>;

    if (!value.includes('/')) {
        return <span>{value}</span>;
    }

    const [num, den] = value.split('/');

    return (
        <span className="fraction">
            <span className="num">{num}</span>
            <span className="den">{den}</span>
        </span>
    );
};
