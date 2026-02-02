import { config, fields, collection } from '@keystatic/core';

export default config({
    storage: {
        kind: 'local',
    },
    collections: {
        posts: collection({
            label: 'Blog Posts',
            path: 'posts/*',
            slugField: 'slug', // Define which field matches the filename
            format: { contentField: 'content' },
            schema: {
                layout: fields.text({ label: 'Layout', defaultValue: 'post' }),
                slug: fields.text({ label: 'Slug (URL Path)', description: 'Must match the filename (e.g., wordpress-security)' }),
                title: fields.text({ label: 'Title' }),
                date: fields.date({ label: 'Date', validation: { isRequired: true } }),
                thumbnail: fields.text({ label: 'Thumbnail' }),
                tags: fields.array(
                    fields.text({ label: 'Tag' }),
                    {
                        label: 'Tags',
                        itemLabel: props => props.value
                    }
                ),
                description: fields.text({
                    label: 'Description',
                    multiline: true,
                }),
                content: fields.markdoc({
                    label: 'Content',
                    extension: 'md',
                }),
            },
            entryLayout: 'content',
        }),
    },
});
