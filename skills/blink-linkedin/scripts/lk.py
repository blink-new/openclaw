import os
import sys
import argparse
import json
from linkedin_api import Linkedin
from requests.cookies import RequestsCookieJar

# Styling
BOLD = "\033[1m"
RESET = "\033[0m"
BLUE = "\033[94m"
GREEN = "\033[92m"

def get_api():
    li_at = os.environ.get("LINKEDIN_LI_AT")
    jsessionid = os.environ.get("LINKEDIN_JSESSIONID")
    if not li_at or not jsessionid:
        print("Error: LINKEDIN_LI_AT and LINKEDIN_JSESSIONID environment variables not set.")
        sys.exit(1)
    
    jar = RequestsCookieJar()
    jar.set("li_at", li_at, domain=".www.linkedin.com")
    jar.set("JSESSIONID", jsessionid, domain=".www.linkedin.com")
    
    return Linkedin("", "", cookies=jar)

def whoami(api):
    profile = api.get_user_profile()
    name = f"{profile.get('firstName', '')} {profile.get('lastName', '')}".strip()
    headline = profile.get('headline', profile.get('miniProfile', {}).get('occupation', 'No headline'))
    location = profile.get('locationName', 'Unknown')
    print(f"{BOLD}{name}{RESET}")
    print(f"{BLUE}{headline}{RESET}")
    print(f"📍 {location}")

def search(api, query):
    results = api.search_people(keywords=query, limit=10)
    print(f"Search results for '{BOLD}{query}{RESET}':")
    for res in results:
        name = res.get('name', 'Unknown')
        job = res.get('jobtitle', 'No headline')
        urn = res.get('urn_id', 'No URN')
        print(f"- {BOLD}{name}{RESET} ({urn})")
        print(f"  {job}")

def view_profile(api, public_id):
    profile = api.get_profile(public_id)
    name = f"{profile.get('firstName', '')} {profile.get('lastName', '')}"
    headline = profile.get('headline', 'No headline')
    summary = profile.get('summary', 'No summary provided.')
    
    print(f"{BOLD}{name}{RESET}")
    print(f"{BLUE}{headline}{RESET}")
    print("-" * 20)
    print(summary)
    
    print(f"\n{BOLD}Experience:{RESET}")
    for exp in profile.get('experience', [])[:3]:
        company = exp.get('companyName', 'Unknown')
        title = exp.get('title', 'Unknown')
        print(f"• {BOLD}{title}{RESET} at {company}")

def check_messages(api):
    conversations = api.get_conversations()
    print(f"{BOLD}Recent Conversations:{RESET}")
    for conv in conversations.get('elements', [])[:5]:
        participants = ", ".join([p.get('firstName', 'Unknown') for p in conv.get('participants', [])])
        events = conv.get('events', [{}])
        snippet = "No preview"
        if events:
             content = events[0].get('eventContent', {})
             msg_event = content.get('com.linkedin.voyager.messaging.event.MessageEvent', {})
             snippet = msg_event.get('body', 'No preview')
        
        print(f"• {BOLD}{participants}{RESET}")
        print(f"  {snippet[:100]}...")

def _extract_post_info(item):
    """Extract author, timestamp, content, and activity URN from a raw Voyager post item."""
    # Activity URN (for liking/commenting via blink connector)
    urn = item.get('updateMetadata', {}).get('urn', '') or item.get('*updateMetadata', '')
    # Normalise to urn:li:activity: format
    if 'activity:' not in urn:
        urn = ''

    # Author name
    actor = item.get('actor', {})
    name = actor.get('name', {}).get('text', '') if isinstance(actor.get('name'), dict) else ''

    # Timestamp (ms epoch)
    created_ms = item.get('actor', {}).get('subDescription', {}).get('text', '')
    created_at_ms = item.get('created', {}).get('time', 0) or 0

    # Content text
    commentary = (
        item.get('commentary', {}).get('text', {}).get('text', '')
        if isinstance(item.get('commentary'), dict)
        else item.get('commentary', '')
    )
    # Fall back to reshared content
    if not commentary:
        content_block = item.get('content', {})
        if isinstance(content_block, dict):
            commentary = content_block.get('description', {}).get('text', '') or ''

    return {
        'urn': urn,
        'author': name,
        'created_ms': created_at_ms,
        'content': commentary,
        'age': created_ms,
    }


def feed(api, count=10):
    """Fetch the most recent N posts from the home feed, newest first."""
    # Fetch more than needed (CHRONOLOGICAL = oldest-first from API), then sort descending.
    fetch_count = min(max(count * 3, 30), 100)
    try:
        # Use the internal Voyager endpoint directly so we can request CHRONOLOGICAL
        # and then re-sort newest-first in Python.
        params = {
            "count": str(fetch_count),
            "q": "chronFeed",
            "start": 0,
        }
        res = api._fetch(
            "/feed/updatesV2",
            params=params,
            headers={"accept": "application/vnd.linkedin.normalized+json+2.1"},
        )
        raw = res.json()
        included = raw.get("included", [])

        # Filter to actual post update elements (have 'commentary' or 'content' + actor)
        posts = [
            _extract_post_info(item)
            for item in included
            if item.get('actor') and (item.get('commentary') or item.get('content'))
        ]

        # Sort newest-first by epoch ms
        posts.sort(key=lambda p: p['created_ms'], reverse=True)
        posts = posts[:count]
    except Exception:
        # Fallback to the library method if direct call fails
        raw_posts = api.get_feed_posts(limit=fetch_count)
        posts = [
            {
                'urn': '',
                'author': p.get('author_name', 'Unknown'),
                'created_ms': 0,
                'content': p.get('content', ''),
                'age': p.get('old', ''),
            }
            for p in raw_posts
        ][:count]

    print(f"{BOLD}LinkedIn Feed — {count} most recent posts:{RESET}\n")
    for i, post in enumerate(posts, 1):
        author = post['author'] or 'Unknown'
        content = post['content'].replace('\n', ' ')
        urn_hint = f"  {BLUE}URN: {post['urn']}{RESET}" if post['urn'] else ''
        print(f"{i}. {BOLD}{author}{RESET}")
        print(f"   {content[:250]}{'…' if len(content) > 250 else ''}")
        if urn_hint:
            print(urn_hint)
        print()

def main():
    parser = argparse.ArgumentParser(description="lk - LinkedIn CLI")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("whoami", help="Display current user profile")
    
    search_parser = subparsers.add_parser("search", help="Search for people")
    search_parser.add_argument("query", help="Search keywords")
    
    profile_parser = subparsers.add_parser("profile", help="View profile details")
    profile_parser.add_argument("public_id", help="Public ID or URN")
    
    subparsers.add_parser("messages", help="Check recent messages")
    
    feed_parser = subparsers.add_parser("feed", help="Summarize your timeline")
    feed_parser.add_argument("-n", "--count", type=int, default=10, help="Number of posts to fetch")
    
    subparsers.add_parser("check", help="Quick status check")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    api = get_api()

    try:
        if args.command == "whoami":
            whoami(api)
        elif args.command == "search":
            search(api, args.query)
        elif args.command == "profile":
            view_profile(api, args.public_id)
        elif args.command == "messages":
            check_messages(api)
        elif args.command == "feed":
            feed(api, args.count)
        elif args.command == "check":
            whoami(api)
            print("-" * 10)
            check_messages(api)
    except Exception as e:
        print(f"{BOLD}LinkedIn Error:{RESET} {e}")

if __name__ == "__main__":
    main()
