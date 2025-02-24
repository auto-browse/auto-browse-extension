import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SettingsService } from "@/storage";

export const DebugToggle: React.FC = () => {
    const [enabled, setEnabled] = React.useState(false);

    // Load initial state
    React.useEffect(() => {
        SettingsService.isDebugMode().then(setEnabled);
    }, []);

    const handleToggle = async (checked: boolean) => {
        try
        {
            await SettingsService.setDebugMode(checked);
            setEnabled(checked);
        } catch (error)
        {
            console.error("Failed to toggle debug mode:", error);
            // Revert UI state if save fails
            setEnabled(!checked);
        }
    };

    return (
        <div className="flex items-center space-x-4">
            <Label htmlFor="debug-mode" className="text-lg font-medium">
                Debug Mode
            </Label>
            <Switch
                id="debug-mode"
                checked={enabled}
                onCheckedChange={handleToggle}
            />
            <p className="text-sm text-muted-foreground">
                {enabled
                    ? "Chat commands are enabled"
                    : "Chat commands are disabled"}
            </p>
        </div>
    );
};
