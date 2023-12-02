#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const marked = require("marked");
const fm = require("front-matter");
const glob = require("glob");

// Function to read a file and return its content
const readFile = (filePath) => fs.readFileSync(filePath, "utf-8");

// Function to write a file with content
const writeFile = (filePath, content) => fs.writeFileSync(filePath, content);

// Function to generate HTML from Markdown content
const generateHTML = (markdownContent) => marked.parse(markdownContent);

// Function to generate the index.html
const generateIndex = (posts) => {
	const links = posts
		.map(
			(post) =>
				`<li><a href="${post.fileName}.html">${post.attributes.title}</a></li>`
		)
		.join("\n");
	const indexContent = `<ul>${links}</ul>`;
	writeFile(path.join("dist", "index.html"), indexContent);
};

// Function to copy media files
const copyMedia = (mediaDir) => {
	const mediaDist = path.join("dist", "media");
	if (!fs.existsSync(mediaDist)) {
		fs.mkdirSync(mediaDist);
	}
	const files = glob.sync(`${mediaDir}/**/*.*`);
	files.forEach((file) => {
		const dest = path.join(mediaDist, path.relative(mediaDir, file));
		fs.copyFileSync(file, dest);
	});
};

// Function to process and generate HTML files for posts
const generatePosts = () => {
	const postsDir = "posts";
	const files = glob.sync(`${postsDir}/**/*.md`);

	const posts = files.map((file) => {
		const content = readFile(file);
		const { attributes, body } = fm(content);
		const htmlContent = generateHTML(body);
		const fileName = path.basename(file, path.extname(file));

		return { fileName, attributes };
	});

	// Sort posts by date in descending order
	posts.sort((a, b) => {
		const dateA = new Date(a.attributes.date);
		const dateB = new Date(b.attributes.date);
		return dateB - dateA;
	});

	// Generate index.html
	generateIndex(posts);

	// Write HTML files for each post
	posts.forEach((post) => {
		const postTemplatePath = path.join(__dirname, "post.html");
		let postTemplate = readFile(postTemplatePath);

		// Replace {{postTitle}} with the actual post title
		// postTemplate = postTemplate.replace(
		//   "{{ postTitle }}",
		//   post.attributes.title
		// );
		var find = "{{ postTitle }}";
		var re = new RegExp(find, "g");

		postTemplate = postTemplate.replace(re, post.attributes.title);

		// Replace {{postContent}} with the rendered content
		const file = path.join(postsDir, `${post.fileName}.md`);
		const content = readFile(file);
		const { body } = fm(content);
		const htmlContent = generateHTML(body);
		postTemplate = postTemplate.replace("{{ postContent }}", htmlContent);

		// Save the updated HTML file to the dist folder
		writeFile(path.join("dist", `${post.fileName}.html`), postTemplate);
	});

	// Copy media files
	copyMedia(path.join(postsDir, "media"));

	// Read the index.html template
	const templatePath = path.join(__dirname, "index.html");
	let indexTemplate = readFile(templatePath);

	// Replace {{ posts }} with the links to each post
	const postLinks = posts
		.map((post) => {
			const dateFromFrontMatter = post.attributes.date;
			const formattedDate = new Date(dateFromFrontMatter).toLocaleDateString(
				"en-US",
				{
					year: "numeric",
					month: "long",
					day: "numeric",
				}
			);

			return `<li class="list-group-item"><a href="${post.fileName}.html">${post.attributes.title}</a><br/><small>${formattedDate}</small></li>`;
		})
		.join("\n");
	indexTemplate = indexTemplate.replace(
		"{{ posts }}",
		`<ul class="list-group">${postLinks}</ul>`
	);

	// Write the updated index.html to the dist folder
	writeFile(path.join("dist", "index.html"), indexTemplate);

	// Copy styles.css to the dist folder
	const stylesPath = path.join(__dirname, "styles.css");
	const stylesDest = path.join("dist", "styles.css");
	fs.copyFileSync(stylesPath, stylesDest);
};

// Run the generator
generatePosts();
