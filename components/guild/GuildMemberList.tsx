import React from 'react';
import { GuildMember } from '../../types/entities.js';

interface GuildMemberListProps {
    members: GuildMember[];
}

const GuildMemberList: React.FC<GuildMemberListProps> = ({ members }) => {
    return (
        <div className="space-y-2">
            {members.map((member) => (
                <div key={member.id} className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-white">{member.userId}</p>
                </div>
            ))}
        </div>
    );
};

export default GuildMemberList;

