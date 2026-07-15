import { MapPin } from "lucide-react";

import Avatar from "../profile/Avatar";

/**
 * Room picker: your regional room, then one private room per accepted ping.
 *
 * A direct room shows the other person's avatar rather than an icon — in a
 * two-person conversation, "who" is the only thing worth identifying it by.
 */
export default function RoomSwitcher({ rooms, activeKey, onSelect }) {
  return (
    <div className="flex flex-col gap-1.5">
      {rooms.map((room) => {
        const active = room.key === activeKey;
        const isDirect = room.kind === "direct";

        return (
          <button
            key={room.key}
            type="button"
            onClick={() => onSelect(room.key)}
            className={`flex w-full items-start gap-3 border px-3.5 py-3 text-left transition-colors ${
              active
                ? "border-accent/50 bg-accent/10"
                : "border-line bg-surface-2 hover:bg-surface-3"
            }`}
          >
            {isDirect ? (
              <Avatar src={room.avatar} name={room.name} size={20} />
            ) : (
              <MapPin
                size={16}
                className={`mt-0.5 shrink-0 ${active ? "text-accent" : "text-ink-3"}`}
              />
            )}

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {room.name}
              </span>
              <span className="block text-[11px] leading-snug text-ink-3">
                {room.description}
              </span>
              {!isDirect && (
                <span className="mt-1 block text-[11px] text-ink-3">
                  {room.memberCount}{" "}
                  {room.memberCount === 1 ? "member" : "members"}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
