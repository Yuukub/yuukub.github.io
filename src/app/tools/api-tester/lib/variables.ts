export interface EnvVariable {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
}

export interface Environment {
    id: string;
    name: string;
    variables: EnvVariable[];
}

/**
 * Resolves variables in the format {{variable_name}} inside a template string.
 * Uses variables from the active environment.
 */
export function resolveVariables(template: string, variables: EnvVariable[]): string {
    if (!template) return "";
    
    // Map of enabled variables
    const varMap: Record<string, string> = {};
    variables.forEach((v) => {
        if (v.enabled && v.key.trim()) {
            varMap[v.key.trim()] = v.value;
        }
    });

    // Replace {{key}} with value from map
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        return trimmedKey in varMap ? varMap[trimmedKey] : match;
    });
}

/**
 * Find all unresolved variables matching the {{variable_name}} syntax in the template.
 */
export function findUnresolvedVariables(template: string, variables: EnvVariable[]): string[] {
    if (!template) return [];

    const varMap = new Set(
        variables
            .filter((v) => v.enabled && v.key.trim())
            .map((v) => v.key.trim())
    );

    const regex = /\{\{([^}]+)\}\}/g;
    const unresolved = new Set<string>();
    let match;

    while ((match = regex.exec(template)) !== null) {
        const key = match[1].trim();
        if (!varMap.has(key)) {
            unresolved.add(key);
        }
    }

    return Array.from(unresolved);
}
