import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
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

export async function getSortedPostsData() {
    // Get file names under /posts
    const fileNames = fs.readdirSync(postsDirectory);
    const allPostsData = fileNames.map((fileName) => {
        // Remove ".md" from file name to get slug
        const slug = fileName.replace(/\.md$/, '');

        // Read markdown file as string
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');

        // Use gray-matter to parse the post metadata section
        const matterResult = matter(fileContents);

        // Calculate reading time
        const wordsPerMinute = 200;
        const noOfWords = matterResult.content.split(/\s+/g).length;
        const readingTime = `${Math.ceil(noOfWords / wordsPerMinute)} นาที`;

        // Combine the data with the slug
        return {
            slug,
            readingTime,
            ...(matterResult.data as { date: string; title: string; tags?: string[]; description?: string; thumbnail?: string }),
        };
    });

    // Sort posts by date
    return allPostsData.sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

export async function getAllPostSlugs() {
    const fileNames = fs.readdirSync(postsDirectory);
    return fileNames.map((fileName) => {
        return {
            slug: fileName.replace(/\.md$/, ''),
        };
    });
}

export async function getPostData(slug: string): Promise<PostData> {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    // Use unified to convert markdown into HTML string with highlighting
    const processedContent = await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeHighlight)
        .use(rehypeStringify)
        .process(matterResult.content);
    const contentHtml = processedContent.toString();

    // Calculate reading time
    const wordsPerMinute = 200;
    const noOfWords = matterResult.content.split(/\s+/g).length;
    const minutes = Math.ceil(noOfWords / wordsPerMinute);
    const readingTime = `${minutes} นาที`;

    // Combine the data with the slug and contentHtml
    return {
        slug,
        contentHtml,
        readingTime,
        ...(matterResult.data as { date: string; title: string; tags?: string[]; description?: string; thumbnail?: string }),
    };
}
