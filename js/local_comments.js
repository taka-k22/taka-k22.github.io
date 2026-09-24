(function() {
    const reactions = ['upvote', 'funny', 'love', 'surprised', 'angry', 'sad'];

    function storageKey(base, type) {
        return 'lablog:' + type + ':' + base;
    }

    function readJson(key, fallback) {
        try {
            const value = window.localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            return;
        }
    }

    function formatDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleString();
    }

    function createCommentElement(comment) {
        const item = document.createElement('article');
        item.className = 'local-comment-item';

        const time = document.createElement('time');
        time.className = 'local-comment-date';
        time.dateTime = comment.createdAt;
        time.textContent = formatDate(comment.createdAt);

        const body = document.createElement('p');
        body.className = 'local-comment-body';
        body.textContent = comment.body;

        item.appendChild(time);
        item.appendChild(body);
        return item;
    }

    function initComments(root) {
        if (!root || root.dataset.localCommentsReady === 'true') {
            return;
        }
        root.dataset.localCommentsReady = 'true';

        const key = root.dataset.commentKey || window.location.pathname;
        const reactionKey = storageKey(key, 'reactions');
        const selectedReactionKey = storageKey(key, 'selected-reaction');
        const commentsKey = storageKey(key, 'comments');

        const reactionCounts = readJson(reactionKey, {});
        reactions.forEach(reaction => {
            if (typeof reactionCounts[reaction] !== 'number') {
                reactionCounts[reaction] = 0;
            }
        });

        let selectedReaction = window.localStorage.getItem(selectedReactionKey);

        function renderReactions() {
            reactions.forEach(reaction => {
                const count = root.querySelector('[data-reaction-count="' + reaction + '"]');
                const button = root.querySelector('[data-reaction="' + reaction + '"]');
                if (count) {
                    count.textContent = reactionCounts[reaction];
                }
                if (button) {
                    button.classList.toggle('is-active', selectedReaction === reaction);
                }
            });
        }

        root.querySelectorAll('[data-reaction]').forEach(button => {
            button.addEventListener('click', () => {
                const reaction = button.dataset.reaction;
                const previous = window.localStorage.getItem(selectedReactionKey);

                if (previous === reaction) {
                    reactionCounts[reaction] = Math.max(0, reactionCounts[reaction] - 1);
                    window.localStorage.removeItem(selectedReactionKey);
                    selectedReaction = null;
                } else {
                    if (previous && typeof reactionCounts[previous] === 'number') {
                        reactionCounts[previous] = Math.max(0, reactionCounts[previous] - 1);
                    }
                    reactionCounts[reaction] += 1;
                    window.localStorage.setItem(selectedReactionKey, reaction);
                    selectedReaction = reaction;
                }
                writeJson(reactionKey, reactionCounts);
                renderReactions();
            });
        });

        const count = root.querySelector('.local-comment-count');
        const list = root.querySelector('.local-comment-list');
        const form = root.querySelector('.local-comment-form');
        const textarea = form ? form.querySelector('textarea[name="comment"]') : null;

        function readComments() {
            return readJson(commentsKey, [])
                .filter(comment => comment && typeof comment.body === 'string')
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        function renderComments() {
            const comments = readComments();
            if (count) {
                count.textContent = comments.length + ' 件のコメント';
            }
            if (!list) {
                return;
            }
            list.replaceChildren();
            comments.forEach(comment => {
                list.appendChild(createCommentElement(comment));
            });
        }

        if (form && textarea) {
            form.addEventListener('submit', event => {
                event.preventDefault();
                const body = textarea.value.trim();
                if (!body) {
                    return;
                }
                const comments = readComments();
                comments.unshift({
                    id: Date.now().toString(36),
                    body,
                    createdAt: new Date().toISOString()
                });
                writeJson(commentsKey, comments);
                textarea.value = '';
                renderComments();
            });
        }

        renderReactions();
        renderComments();
    }

    function initAll() {
        document.querySelectorAll('#comments[data-comment-key]').forEach(initComments);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
    document.addEventListener('pjax:complete', initAll);
}());
