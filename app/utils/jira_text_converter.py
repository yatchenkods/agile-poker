"""Jira text format converter

Converts Jira markup formats (Atlassian Document Format, wiki markup) to HTML
while preserving structure and readability.
"""

import json
import logging
import html
from typing import Any, Dict, List, Optional
from urllib.parse import quote, unquote

logger = logging.getLogger(__name__)


class JiraTextConverter:
    """Convert Jira text formats to HTML"""

    @staticmethod
    def convert(text: Optional[str]) -> str:
        """
        Convert Jira formatted text to HTML.
        
        Handles:
        - Atlassian Document Format (ADF) JSON
        - Jira wiki markup
        - Plain text (returns as-is wrapped in <p> tag)
        
        Args:
            text: Jira formatted text (ADF, wiki markup, or plain text)
            
        Returns:
            Converted HTML with preserved structure
        """
        if not text:
            return ""
        
        text = text.strip()
        if not text:
            return ""
        
        # Try to parse as ADF (Atlassian Document Format) JSON first
        if text.startswith('{') and text.endswith('}'):
            try:
                return JiraTextConverter._convert_adf(text)
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.debug(f"Failed to parse as ADF: {e}. Trying wiki markup.")
        
        # Try to convert wiki markup
        result = JiraTextConverter._convert_wiki_markup(text)
        return result

    @staticmethod
    def _convert_adf(json_text: str) -> str:
        """
        Convert Atlassian Document Format (ADF) JSON to HTML.
        
        ADF is a structured JSON format used in Jira for rich text content.
        
        Args:
            json_text: JSON string in ADF format
            
        Returns:
            HTML with preserved structure
        """
        try:
            data = json.loads(json_text)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in ADF: {e}")
            return f"<p>{html.escape(json_text)}</p>"
        
        if not isinstance(data, dict):
            return f"<p>{html.escape(str(data))}</p>"
        
        # Extract content from ADF document
        if 'content' not in data:
            return ""
        
        content = data.get('content', [])
        if not isinstance(content, list):
            return ""
        
        # Convert each content block
        result_html = []
        for block in content:
            converted = JiraTextConverter._convert_adf_block(block)
            if converted:
                result_html.append(converted)
        
        return ''.join(result_html).strip()

    @staticmethod
    def _convert_adf_block(block: Dict[str, Any]) -> str:
        """
        Convert a single ADF block to HTML.
        
        Handles: paragraph, heading, bullet_list, ordered_list, code_block, etc.
        
        Args:
            block: Single ADF block dictionary
            
        Returns:
            Converted HTML for this block
        """
        if not isinstance(block, dict):
            return ""
        
        block_type = block.get('type', '')
        
        # Handle different block types
        if block_type == 'paragraph':
            content = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return f"<p>{content}</p>" if content else ""
        
        elif block_type in ('heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'):
            level = int(block_type[-1])
            content = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return f"<h{level}>{content}</h{level}>" if content else ""
        
        elif block_type == 'bullet_list':
            return JiraTextConverter._convert_adf_list(block.get('content', []), ordered=False)
        
        elif block_type == 'ordered_list':
            return JiraTextConverter._convert_adf_list(block.get('content', []), ordered=True)
        
        elif block_type == 'code_block':
            content = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return f"<pre><code>{html.escape(content)}</code></pre>" if content else ""
        
        elif block_type == 'blockquote':
            content = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return f"<blockquote>{content}</blockquote>" if content else ""
        
        elif block_type == 'table':
            return JiraTextConverter._convert_adf_table(block)
        
        elif block_type in ('panel', 'info', 'note', 'tip', 'warning'):
            # Panels are informational blocks
            content = JiraTextConverter._convert_adf_inline(block.get('content', []))
            return f"<div class='jira-panel'>{content}</div>" if content else ""
        
        return ""

    @staticmethod
    def _convert_adf_inline(content: List[Dict]) -> str:
        """
        Convert ADF inline content (text with formatting) to HTML.
        
        Handles: text with marks (bold, italic, code, etc.), mentions, links, emojis
        
        Args:
            content: List of inline content blocks
            
        Returns:
            Formatted HTML text
        """
        if not isinstance(content, list):
            return ""
        
        result = []
        for item in content:
            if not isinstance(item, dict):
                continue
            
            item_type = item.get('type', '')
            
            # Handle text with marks
            if item_type == 'text':
                text = html.escape(item.get('text', ''))
                marks = item.get('marks', [])
                
                # Apply text marks (formatting)
                for mark in marks:
                    mark_type = mark.get('type', '')
                    
                    if mark_type == 'strong':
                        text = f"<strong>{text}</strong>"
                    elif mark_type == 'em':
                        text = f"<em>{text}</em>"
                    elif mark_type == 'code':
                        text = f"<code>{text}</code>"
                    elif mark_type == 'strikethrough':
                        text = f"<del>{text}</del>"
                    elif mark_type == 'underline':
                        text = f"<u>{text}</u>"
                    elif mark_type == 'link':
                        href = mark.get('attrs', {}).get('href', '#')
                        href = JiraTextConverter._sanitize_url(href)
                        text = f"<a href='{href}' target='_blank' rel='noopener noreferrer'>{text}</a>"
                
                result.append(text)
            
            # Handle link blocks (not just marks)
            elif item_type == 'link':
                attrs = item.get('attrs', {})
                href = attrs.get('href', '#')
                href = JiraTextConverter._sanitize_url(href)
                
                # Get link text from content
                link_text = ""
                if 'content' in item:
                    link_text = JiraTextConverter._convert_adf_inline(item.get('content', []))
                else:
                    link_text = attrs.get('text', href)
                
                if link_text:
                    result.append(f"<a href='{href}' target='_blank' rel='noopener noreferrer'>{link_text}</a>")
            
            # Handle mentions
            elif item_type == 'mention':
                attrs = item.get('attrs', {})
                name = attrs.get('text', '@unknown')
                user_id = attrs.get('id', '')
                result.append(f"<span class='jira-mention' title='User ID: {user_id}'>@{html.escape(name)}</span>")
            
            # Handle emojis
            elif item_type == 'emoji':
                attrs = item.get('attrs', {})
                emoji_text = attrs.get('text', '')
                short_name = attrs.get('shortName', '')
                result.append(html.escape(emoji_text))
            
            # Handle hard and soft breaks
            elif item_type == 'hardBreak':
                result.append('<br/>')
            elif item_type == 'softBreak':
                result.append(' ')
        
        return ''.join(result).strip()

    @staticmethod
    def _sanitize_url(url: str) -> str:
        """
        Sanitize and validate URLs for security.
        
        Args:
            url: Original URL
            
        Returns:
            Sanitized URL safe for href attribute
        """
        if not url:
            return '#'
        
        url = url.strip()
        
        # Block dangerous protocols
        dangerous_protocols = ['javascript:', 'data:', 'vbscript:', 'file:']
        lower_url = url.lower()
        
        for protocol in dangerous_protocols:
            if lower_url.startswith(protocol):
                logger.warning(f"Blocked dangerous URL protocol: {protocol}")
                return '#'
        
        # Ensure absolute URLs have protocol
        if not url.startswith(('http://', 'https://', 'ftp://', 'ftps://', '#', 'mailto:')):
            # Relative URL - keep as is
            pass
        
        # HTML escape the URL for safety in attributes
        return html.escape(url, quote=True)

    @staticmethod
    def _convert_adf_list(content: List[Dict], ordered: bool = False) -> str:
        """
        Convert ADF list items to HTML.
        
        Args:
            content: List of list_item blocks
            ordered: True for ordered list, False for bullet list
            
        Returns:
            Formatted HTML list
        """
        if not isinstance(content, list):
            return ""
        
        tag = 'ol' if ordered else 'ul'
        items = []
        
        for item in content:
            if item.get('type') != 'list_item':
                continue
            
            item_content = item.get('content', [])
            if not item_content:
                continue
            
            # Process first paragraph in list item
            first_para_content = ""
            nested_html = ""
            
            for block in item_content:
                block_type = block.get('type', '')
                
                if block_type == 'paragraph':
                    # Only use first paragraph's content for list item text
                    if not first_para_content:
                        first_para_content = JiraTextConverter._convert_adf_inline(block.get('content', []))
                elif block_type in ('bullet_list', 'ordered_list'):
                    # Nested lists
                    nested_html += JiraTextConverter._convert_adf_block(block)
            
            # Create list item with content and nested lists
            li_content = first_para_content
            if nested_html:
                li_content += nested_html
            
            if li_content:
                items.append(f"<li>{li_content}</li>")
        
        if items:
            return f"<{tag}>{''.join(items)}</{tag}>"
        return ""

    @staticmethod
    def _convert_adf_table(block: Dict) -> str:
        """
        Convert ADF table to HTML table.
        
        Args:
            block: ADF table block
            
        Returns:
            HTML table
        """
        content = block.get('content', [])
        if not content:
            return ""
        
        rows = []
        for row_block in content:
            if row_block.get('type') != 'table_row':
                continue
            
            cells = []
            for cell in row_block.get('content', []):
                cell_type = cell.get('type', '')
                cell_text = JiraTextConverter._convert_adf_inline(cell.get('content', []))
                
                if cell_type == 'table_header':
                    cells.append(f"<th>{cell_text}</th>")
                else:
                    cells.append(f"<td>{cell_text}</td>")
            
            if cells:
                rows.append(f"<tr>{''.join(cells)}</tr>")
        
        if rows:
            return f"<table><tbody>{''.join(rows)}</tbody></table>"
        return ""

    @staticmethod
    def _convert_wiki_markup(text: str) -> str:
        """
        Convert Jira wiki markup to HTML.
        
        Handles: bold, italic, strikethrough, code, headings, lists, etc.
        
        Args:
            text: Text with wiki markup
            
        Returns:
            Converted HTML
        """
        import re
        
        # Process line by line
        lines = text.split('\n')
        result_lines = []
        in_list = False
        list_type = None  # Track 'ul' or 'ol'
        in_code_block = False
        code_content = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Handle code blocks
            if line.strip().startswith('{code') or line.strip().startswith('{{code'):
                in_code_block = True
                i += 1
                continue
            elif line.strip().endswith('}code}') or line.strip().endswith('code}}'):
                if code_content:
                    result_lines.append(f"<pre><code>{''.join(code_content)}</code></pre>")
                in_code_block = False
                code_content = []
                i += 1
                continue
            elif in_code_block:
                code_content.append(html.escape(line) + '\n')
                i += 1
                continue
            
            # Handle headings: h1. Title -> <h1>Title</h1>
            heading_match = re.match(r'^h(\d)\. (.*)', line)
            if heading_match:
                if in_list:
                    result_lines.append(f"</{list_type}>")
                    in_list = False
                    list_type = None
                level = heading_match.group(1)
                title = html.escape(heading_match.group(2))
                result_lines.append(f"<h{level}>{title}</h{level}>")
                i += 1
                continue
            
            # Handle bullet lists (* or -)
            bullet_match = re.match(r'^([*\-]+) (.*)', line)
            if bullet_match:
                depth = len(bullet_match.group(1))
                item_text = html.escape(bullet_match.group(2))
                
                # Apply inline formatting
                item_text = JiraTextConverter._apply_wiki_inline_formatting(item_text)
                
                if not in_list or list_type != 'ul':
                    if in_list:
                        result_lines.append(f"</{list_type}>")
                    result_lines.append("<ul>")
                    in_list = True
                    list_type = 'ul'
                
                result_lines.append(f"<li>{item_text}</li>")
                i += 1
                continue
            
            # Handle numbered lists (#)
            num_match = re.match(r'^(#+) (.*)', line)
            if num_match:
                depth = len(num_match.group(1))
                item_text = html.escape(num_match.group(2))
                
                # Apply inline formatting
                item_text = JiraTextConverter._apply_wiki_inline_formatting(item_text)
                
                if not in_list or list_type != 'ol':
                    if in_list:
                        result_lines.append(f"</{list_type}>")
                    result_lines.append("<ol>")
                    in_list = True
                    list_type = 'ol'
                
                result_lines.append(f"<li>{item_text}</li>")
                i += 1
                continue
            
            # End list if we hit non-list, non-empty content
            if in_list and line.strip():
                result_lines.append(f"</{list_type}>")
                in_list = False
                list_type = None
            
            # Handle blockquotes
            if line.startswith('bq. '):
                quote_text = html.escape(line[4:])
                quote_text = JiraTextConverter._apply_wiki_inline_formatting(quote_text)
                result_lines.append(f"<blockquote>{quote_text}</blockquote>")
                i += 1
                continue
            
            # Handle paragraphs (non-empty lines)
            if line.strip():
                # Apply inline formatting
                formatted = html.escape(line)
                formatted = JiraTextConverter._apply_wiki_inline_formatting(formatted)
                result_lines.append(f"<p>{formatted}</p>")
            
            i += 1
        
        # Close any open lists
        if in_list:
            result_lines.append(f"</{list_type}>")
        
        # Close any open code blocks
        if code_content:
            result_lines.append(f"<pre><code>{''.join(code_content)}</code></pre>")
        
        return ''.join(result_lines).strip()

    @staticmethod
    def _apply_wiki_inline_formatting(text: str) -> str:
        """
        Apply inline formatting to wiki markup text.
        
        Converts: *bold*, _italic_, -strikethrough-, {{code}}, [Link|URL]
        
        Note: text should already be HTML escaped before calling this
        """
        import re
        
        # *text* -> <strong>text</strong>
        text = re.sub(r'\*([^*]+)\*', r'<strong>\1</strong>', text)
        
        # _text_ -> <em>text</em>
        text = re.sub(r'_([^_]+)_', r'<em>\1</em>', text)
        
        # -text- -> <del>text</del> (but be careful with hyphens)
        text = re.sub(r'-([^-]+)-', r'<del>\1</del>', text)
        
        # {{text}} -> <code>text</code>
        text = re.sub(r'{{([^}]+)}}', r'<code>\1</code>', text)
        
        # [Link Text|URL] -> <a href="URL" target="_blank" rel="noopener noreferrer">Link Text</a>
        def replace_link(match):
            link_text = match.group(1).strip()
            url = match.group(2).strip()
            # Sanitize URL
            url = JiraTextConverter._sanitize_url(url)
            return f'<a href="{url}" target="_blank" rel="noopener noreferrer">{link_text}</a>'
        
        text = re.sub(r'\[([^|\]]+)\|([^\]]+)\]', replace_link, text)
        
        return text


# Convenience function
def convert_jira_text(text: Optional[str]) -> str:
    """
    Convenience function to convert Jira formatted text to HTML.
    
    Args:
        text: Jira formatted text
        
    Returns:
        Converted HTML
    """
    return JiraTextConverter.convert(text)
