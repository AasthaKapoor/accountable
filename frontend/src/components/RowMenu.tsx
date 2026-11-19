import * as Menu from "@radix-ui/react-dropdown-menu";
import { Icon } from "./Icon";

export function RowMenu({ label, onEdit, onDelete }: { label: string; onEdit?: () => void; onDelete: () => void }) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className="icon-btn" aria-label={`Actions for ${label}`} onClick={(e) => e.stopPropagation()}>
        <Icon name="more" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="menu" align="end" sideOffset={4} onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <Menu.Item className="menu-item" onSelect={onEdit}>
              <Icon name="edit" />
              Edit
            </Menu.Item>
          )}
          <Menu.Item className="menu-item danger" onSelect={onDelete}>
            <Icon name="trash" />
            Delete
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
