import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFootnotes from 'remark-footnotes';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

const postsDirectory = path.join(process.cwd(), 'posts');

export interface PostData {
    slug: string;
    title: string;
    date: string;
    tags?: string[];
    description?: string;
    contentHtml: string;
    thumbnail?: string;
    readingTime: string;
}

export async function getSortedPostsData(locale?: string) {
    // Get file names under /posts
    const fileNames = fs.readdirSync(postsDirectory);
    const allPostsData = fileNames
        .filter(fileName => /\.(md|mdoc)$/.test(fileName))
        .map((fileName) => {
            // Remove ".md" or ".mdoc" from file name to get slug
            const slug = fileName.replace(/\.(md|mdoc)$/, '');

            // Read markdown file as string
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, 'utf8');

            // Use gray-matter to parse the post metadata section
            const matterResult = matter(fileContents);

            // Calculate reading time
            const wordsPerMinute = 200;
            const noOfWords = matterResult.content.split(/\s+/g).length;
            const min = Math.ceil(noOfWords / wordsPerMinute);
            const readingTime = locale === "en" ? `${min} min read` : `${min} นาที`;

            // Combine the data with the slug
            return {
                slug,
                readingTime,
                ...(matterResult.data as { date: string; title: string; tags?: string[]; description?: string; thumbnail?: string }),
                thumbnail: matterResult.data.thumbnail && !matterResult.data.thumbnail.startsWith('http') && !matterResult.data.thumbnail.startsWith('/')
                    ? `/images/blog/${matterResult.data.thumbnail}`
                    : matterResult.data.thumbnail,
            };
        });

    // Sort posts by date
    return allPostsData.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA < dateB) {
            return 1;
        } else {
            return -1;
        }
    });
}

export async function getAllPostSlugs() {
    const fileNames = fs.readdirSync(postsDirectory);
    return fileNames
        .filter(fileName => /\.(md|mdoc)$/.test(fileName))
        .map((fileName) => {
            return {
                slug: fileName.replace(/\.(md|mdoc)$/, ''),
            };
        });
}

export async function getPostData(slug: string, locale?: string): Promise<PostData> {
    let fullPath = path.join(postsDirectory, `${slug}.md`);

    // If .md doesn't exist, try .mdoc
    if (!fs.existsSync(fullPath)) {
        fullPath = path.join(postsDirectory, `${slug}.mdoc`);
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    // Rewrite relative image paths to point to /images/blog/
    // This matches ![alt](filename.ext) where filename doesn't start with / or http
    const contentWithFixedImages = matterResult.content.replace(
        /!\[(.*?)\]\((?!https?:\/\/|\/)(.*?)\)/g,
        '![$1](/images/blog/$2)'
    );

    // Use unified to convert markdown into HTML string with highlighting
    const processedContent = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .use(remarkFootnotes as any, { inlineNotes: true })
        .use(remarkRehype)
        .use(rehypeHighlight)
        .use(rehypeStringify)
        .process(contentWithFixedImages);

    // Wrap tables in a div for responsive scrolling and background styling
    // and transform GitHub-style alerts [!TIP] into styled divs
    const contentHtml = processedContent.toString()
        .replace(/<table>/g, '<div class="table-wrapper"><table>')
        .replace(/<\/table>/g, '</table></div>')
        .replace(/<blockquote>\s*<p>\[!(TIP|IMPORTANT|NOTE|WARNING|CAUTION)\]([\s\S]*?)<\/blockquote>/gi, (match, type, content) => {
            const title = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
            return `<div class="alert-block alert-${type.toLowerCase()}"><p class="alert-title">${title}</p>${content}</div>`;
        });

    // Calculate reading time
    const wordsPerMinute = 200;
    const noOfWords = matterResult.content.split(/\s+/g).length;
    const minutes = Math.ceil(noOfWords / wordsPerMinute);
    const readingTime = locale === "en" ? `${minutes} min read` : `${minutes} นาที`;

    // Combine the data with the slug and contentHtml
    return {
        slug,
        contentHtml,
        readingTime,
        ...(matterResult.data as { date: string; title: string; tags?: string[]; description?: string; thumbnail?: string }),
        thumbnail: matterResult.data.thumbnail && !matterResult.data.thumbnail.startsWith('http') && !matterResult.data.thumbnail.startsWith('/')
            ? `/images/blog/${matterResult.data.thumbnail}`
            : matterResult.data.thumbnail,
    };
}
