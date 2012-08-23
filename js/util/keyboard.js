  


<!DOCTYPE html>
<html>
  <head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# githubog: http://ogp.me/ns/fb/githubog#">
    <meta charset='utf-8'>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>KeyboardJS/keyboard.js at master · RobertWHurst/KeyboardJS</title>
    <link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="GitHub" />
    <link rel="fluid-icon" href="https://github.com/fluidicon.png" title="GitHub" />
    <link rel="apple-touch-icon-precomposed" sizes="57x57" href="apple-touch-icon-114.png" />
    <link rel="apple-touch-icon-precomposed" sizes="114x114" href="apple-touch-icon-114.png" />
    <link rel="apple-touch-icon-precomposed" sizes="72x72" href="apple-touch-icon-144.png" />
    <link rel="apple-touch-icon-precomposed" sizes="144x144" href="apple-touch-icon-144.png" />

    
    
    <link rel="icon" type="image/x-icon" href="/favicon.png" />

    <meta content="authenticity_token" name="csrf-param" />
<meta content="lxGDqhncDpxwlonStfXzcD+KJYkz7r2kjSkg0vqq8js=" name="csrf-token" />

    <link href="https://a248.e.akamai.net/assets.github.com/assets/github-4a6f56afc5353439638a253b08505cecf02c3a54.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="https://a248.e.akamai.net/assets.github.com/assets/github2-aa4faaa24b5288a3f802c4c0046ad6b0217ffc06.css" media="screen" rel="stylesheet" type="text/css" />
    


    <script src="https://a248.e.akamai.net/assets.github.com/assets/frameworks-cc8431500f70fcd18c6da029472b59d6c39d0d95.js" type="text/javascript"></script>
    
    <script defer="defer" src="https://a248.e.akamai.net/assets.github.com/assets/github-bb3c6bdf9fcd57e496b6621720ea2e9ac8d1e94c.js" type="text/javascript"></script>
    
    

      <link rel='permalink' href='/RobertWHurst/KeyboardJS/blob/25f0f958cdcacd343d19abae7713111fc6f79c1e/keyboard.js'>
    <meta property="og:title" content="KeyboardJS"/>
    <meta property="og:type" content="githubog:gitrepository"/>
    <meta property="og:url" content="https://github.com/RobertWHurst/KeyboardJS"/>
    <meta property="og:image" content="https://a248.e.akamai.net/assets.github.com/images/gravatars/gravatar-140.png?1340935010"/>
    <meta property="og:site_name" content="GitHub"/>
    <meta property="og:description" content="KeyboardJS - A library for binding to keys and key combos without the pain of key codes and key combo conflicts."/>

    <meta name="description" content="KeyboardJS - A library for binding to keys and key combos without the pain of key codes and key combo conflicts." />

  <link href="https://github.com/RobertWHurst/KeyboardJS/commits/master.atom" rel="alternate" title="Recent Commits to KeyboardJS:master" type="application/atom+xml" />

  </head>


  <body class="logged_in page-blob macintosh vis-public env-production ">
    <div id="wrapper">

    
    

      <div id="header" class="true clearfix">
        <div class="container clearfix">
          <a class="site-logo" href="https://github.com/">
            <img alt="GitHub" class="github-logo-4x" height="30" src="https://a248.e.akamai.net/assets.github.com/images/modules/header/logov7@4x.png?1340935010" />
            <img alt="GitHub" class="github-logo-4x-hover" height="30" src="https://a248.e.akamai.net/assets.github.com/images/modules/header/logov7@4x-hover.png?1340935010" />
          </a>

              <a href="/notifications" class="notification-indicator tooltipped downwards" title="You have no unread notifications">
                <span class="mail-status all-read"></span>
              </a>

              
    <div class="topsearch ">
        <form accept-charset="UTF-8" action="/search" id="top_search_form" method="get">
  <a href="/search" class="advanced-search tooltipped downwards" title="Advanced Search"><span class="mini-icon mini-icon-advanced-search"></span></a>
  <div class="search placeholder-field js-placeholder-field">
    <input type="text" class="search my_repos_autocompleter" id="global-search-field" name="q" results="5" spellcheck="false" autocomplete="off" data-autocomplete="my-repos-autocomplete" placeholder="Search&hellip;" data-hotkey="s" />
    <div id="my-repos-autocomplete" class="autocomplete-results">
      <ul class="js-navigation-container"></ul>
    </div>
    <input type="submit" value="Search" class="button">
    <span class="mini-icon mini-icon-search-input"></span>
  </div>
  <input type="hidden" name="type" value="Everything" />
  <input type="hidden" name="repo" value="" />
  <input type="hidden" name="langOverride" value="" />
  <input type="hidden" name="start_value" value="1" />
</form>

      <ul class="top-nav">
          <li class="explore"><a href="https://github.com/explore">Explore</a></li>
          <li><a href="https://gist.github.com">Gist</a></li>
          <li><a href="/blog">Blog</a></li>
        <li><a href="http://help.github.com">Help</a></li>
      </ul>
    </div>


            


  <div id="userbox">
    <div id="user">
      <a href="https://github.com/inolen"><img height="20" src="https://secure.gravatar.com/avatar/e14d023328c01d01f6e6e099b8ae7ca3?s=140&amp;d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png" width="20" /></a>
      <a href="https://github.com/inolen" class="name">inolen</a>
    </div>
    <ul id="user-links">
      <li>
        <a href="/new" id="new_repo" class="tooltipped downwards" title="Create a New Repo"><span class="mini-icon mini-icon-create"></span></a>
      </li>
      <li>
        <a href="/settings/profile" id="account_settings"
          class="tooltipped downwards"
          title="Account Settings ">
          <span class="mini-icon mini-icon-account-settings"></span>
        </a>
      </li>
      <li>
          <a href="/logout" data-method="post" id="logout" class="tooltipped downwards" title="Sign Out">
            <span class="mini-icon mini-icon-logout"></span>
          </a>
      </li>
    </ul>
  </div>



          
        </div>
      </div>

      

      

            <div class="site hfeed" itemscope itemtype="http://schema.org/WebPage">
      <div class="container hentry">
        <div class="pagehead repohead instapaper_ignore readability-menu">
        <div class="title-actions-bar">
          



              <ul class="pagehead-actions">


          <li class="subscription">
              <form accept-charset="UTF-8" action="/notifications/subscribe" data-autosubmit="true" data-remote="true" method="post"><div style="margin:0;padding:0;display:inline"><input name="authenticity_token" type="hidden" value="lxGDqhncDpxwlonStfXzcD+KJYkz7r2kjSkg0vqq8js=" /></div>
  <input id="repository_id" name="repository_id" type="hidden" value="2869424" />
  <div class="context-menu-container js-menu-container js-context-menu">
    <span class="minibutton switcher bigger js-menu-target">
      <span class="js-context-button">
          <span class="mini-icon mini-icon-watching"></span> Watch
      </span>
    </span>

    <div class="context-pane js-menu-content">
      <a href="javascript:;" class="close js-menu-close"><span class="mini-icon mini-icon-remove-close"></span></a>
      <div class="context-title">Notification status</div>

      <div class="context-body pane-selector">
        <ul class="js-navigation-container">
          <li class="selector-item js-navigation-item js-navigation-target selected">
            <span class="mini-icon mini-icon-confirm"></span>
            <label>
              <input checked="checked" id="do_included" name="do" type="radio" value="included" />
              <h4>Not watching</h4>
              <p>You will only receive notifications when you participate or are mentioned.</p>
            </label>
            <span class="context-button-text js-context-button-text">
              <span class="mini-icon mini-icon-watching"></span>
              Watch
            </span>
          </li>
          <li class="selector-item js-navigation-item js-navigation-target ">
            <span class="mini-icon mini-icon-confirm"></span>
            <label>
              <input id="do_subscribed" name="do" type="radio" value="subscribed" />
              <h4>Watching</h4>
              <p>You will receive all notifications for this repository.</p>
            </label>
            <span class="context-button-text js-context-button-text">
              <span class="mini-icon mini-icon-unwatch"></span>
              Unwatch
            </span>
          </li>
          <li class="selector-item js-navigation-item js-navigation-target ">
            <span class="mini-icon mini-icon-confirm"></span>
            <label>
              <input id="do_ignore" name="do" type="radio" value="ignore" />
              <h4>Ignored</h4>
              <p>You will not receive notifications for this repository.</p>
            </label>
            <span class="context-button-text js-context-button-text">
              <span class="mini-icon mini-icon-mute"></span>
              Stop ignoring
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</form>
          </li>

          <li class="js-toggler-container js-social-container starring-container ">
            <a href="/RobertWHurst/KeyboardJS/unstar" class="minibutton js-toggler-target starred" data-remote="true" data-method="post" rel="nofollow">
              <span class="mini-icon mini-icon-star"></span>
                Unstar
            </a><a href="/RobertWHurst/KeyboardJS/star" class="minibutton js-toggler-target unstarred" data-remote="true" data-method="post" rel="nofollow">
              <span class="mini-icon mini-icon-star"></span>
                Star
            </a><a class="social-count js-social-count" href="/RobertWHurst/KeyboardJS/stargazers">470</a>
          </li>

              <li>
                <a href="/RobertWHurst/KeyboardJS/fork_select" class="minibutton btn-fork js-toggler-target lighter" rel="facebox nofollow">Fork</a><a href="/RobertWHurst/KeyboardJS/network" class="social-count">24</a>
              </li>


    </ul>

          <h1 itemscope itemtype="http://data-vocabulary.org/Breadcrumb" class="entry-title public">
            <span class="repo-label"><span>public</span></span>
            <span class="mega-icon mega-icon-public-repo"></span>
            <span class="author vcard">
<a href="/RobertWHurst" class="url fn" itemprop="url" rel="author">              <span itemprop="title">RobertWHurst</span>
              </a></span> /
            <strong><a href="/RobertWHurst/KeyboardJS" class="js-current-repository">KeyboardJS</a></strong>
          </h1>
        </div>

          

  <ul class="tabs">
    <li><a href="/RobertWHurst/KeyboardJS" class="selected" highlight="repo_sourcerepo_downloadsrepo_commitsrepo_tagsrepo_branches">Code</a></li>
    <li><a href="/RobertWHurst/KeyboardJS/network" highlight="repo_network">Network</a>
    <li><a href="/RobertWHurst/KeyboardJS/pulls" highlight="repo_pulls">Pull Requests <span class='counter'>1</span></a></li>

      <li><a href="/RobertWHurst/KeyboardJS/issues" highlight="repo_issues">Issues <span class='counter'>5</span></a></li>

      <li><a href="/RobertWHurst/KeyboardJS/wiki" highlight="repo_wiki">Wiki</a></li>

    <li><a href="/RobertWHurst/KeyboardJS/graphs" highlight="repo_graphsrepo_contributors">Graphs</a></li>


  </ul>
  
<div class="frame frame-center tree-finder" style="display:none"
      data-tree-list-url="/RobertWHurst/KeyboardJS/tree-list/25f0f958cdcacd343d19abae7713111fc6f79c1e"
      data-blob-url-prefix="/RobertWHurst/KeyboardJS/blob/25f0f958cdcacd343d19abae7713111fc6f79c1e"
    >

  <div class="breadcrumb">
    <span class="bold"><a href="/RobertWHurst/KeyboardJS">KeyboardJS</a></span> /
    <input class="tree-finder-input js-navigation-enable" type="text" name="query" autocomplete="off" spellcheck="false">
  </div>

    <div class="octotip">
      <p>
        <a href="/RobertWHurst/KeyboardJS/dismiss-tree-finder-help" class="dismiss js-dismiss-tree-list-help" title="Hide this notice forever" rel="nofollow">Dismiss</a>
        <span class="bold">Octotip:</span> You've activated the <em>file finder</em>
        by pressing <span class="kbd">t</span> Start typing to filter the
        file list. Use <span class="kbd badmono">↑</span> and
        <span class="kbd badmono">↓</span> to navigate,
        <span class="kbd">enter</span> to view files.
      </p>
    </div>

  <table class="tree-browser" cellpadding="0" cellspacing="0">
    <tr class="js-header"><th>&nbsp;</th><th>name</th></tr>
    <tr class="js-no-results no-results" style="display: none">
      <th colspan="2">No matching files</th>
    </tr>
    <tbody class="js-results-list js-navigation-container">
    </tbody>
  </table>
</div>

<div id="jump-to-line" style="display:none">
  <h2>Jump to Line</h2>
  <form accept-charset="UTF-8">
    <input class="textfield" type="text">
    <div class="full-button">
      <button type="submit" class="classy">
        Go
      </button>
    </div>
  </form>
</div>


<div class="tabnav">

  <span class="tabnav-right">
    <ul class="tabnav-tabs">
      <li><a href="/RobertWHurst/KeyboardJS/tags" class="tabnav-tab" highlight="repo_tags">Tags <span class="counter ">6</span></a></li>
      <li><a href="/RobertWHurst/KeyboardJS/downloads" class="tabnav-tab" highlight="repo_downloads">Downloads <span class="counter ">2</span></a></li>
    </ul>
    
  </span>

  <div class="tabnav-widget scope">

    <div class="context-menu-container js-menu-container js-context-menu">
      <a href="#"
         class="minibutton bigger switcher js-menu-target js-commitish-button btn-branch repo-tree"
         data-hotkey="w"
         data-master-branch="master"
         data-ref="master">
         <span><i>branch:</i> master</span>
      </a>

      <div class="context-pane commitish-context js-menu-content">
        <a href="javascript:;" class="close js-menu-close"><span class="mini-icon mini-icon-remove-close"></span></a>
        <div class="context-title">Switch branches/tags</div>
        <div class="context-body pane-selector commitish-selector js-navigation-container">
          <div class="filterbar">
            <input type="text" id="context-commitish-filter-field" class="js-navigation-enable" placeholder="Filter branches/tags" data-filterable />
            <ul class="tabs">
              <li><a href="#" data-filter="branches" class="selected">Branches</a></li>
              <li><a href="#" data-filter="tags">Tags</a></li>
            </ul>
          </div>

          <div class="js-filter-tab js-filter-branches" data-filterable-for="context-commitish-filter-field" data-filterable-type=substring>
            <div class="no-results js-not-filterable">Nothing to show</div>
              <div class="commitish-item branch-commitish selector-item js-navigation-item js-navigation-target ">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/gh-pages/keyboard.js" class="js-navigation-open" data-name="gh-pages" rel="nofollow">gh-pages</a>
                </h4>
              </div>
              <div class="commitish-item branch-commitish selector-item js-navigation-item js-navigation-target selected">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/master/keyboard.js" class="js-navigation-open" data-name="master" rel="nofollow">master</a>
                </h4>
              </div>
              <div class="commitish-item branch-commitish selector-item js-navigation-item js-navigation-target ">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/v0.3.0/keyboard.js" class="js-navigation-open" data-name="v0.3.0" rel="nofollow">v0.3.0</a>
                </h4>
              </div>
          </div>

          <div class="js-filter-tab js-filter-tags" style="display:none" data-filterable-for="context-commitish-filter-field" data-filterable-type=substring>
            <div class="no-results js-not-filterable">Nothing to show</div>
              <div class="commitish-item tag-commitish selector-item js-navigation-item js-navigation-target ">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/v0.2.2/keyboard.js" class="js-navigation-open" data-name="v0.2.2" rel="nofollow">v0.2.2</a>
                </h4>
              </div>
              <div class="commitish-item tag-commitish selector-item js-navigation-item js-navigation-target ">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/v0.2.1/keyboard.js" class="js-navigation-open" data-name="v0.2.1" rel="nofollow">v0.2.1</a>
                </h4>
              </div>
              <div class="commitish-item tag-commitish selector-item js-navigation-item js-navigation-target ">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/v0.2.0/keyboard.js" class="js-navigation-open" data-name="v0.2.0" rel="nofollow">v0.2.0</a>
                </h4>
              </div>
              <div class="commitish-item tag-commitish selector-item js-navigation-item js-navigation-target ">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/v0.1.0/keyboard.js" class="js-navigation-open" data-name="v0.1.0" rel="nofollow">v0.1.0</a>
                </h4>
              </div>
              <div class="commitish-item tag-commitish selector-item js-navigation-item js-navigation-target ">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/v0.0.2-AMD/keyboard.js" class="js-navigation-open" data-name="v0.0.2-AMD" rel="nofollow">v0.0.2-AMD</a>
                </h4>
              </div>
              <div class="commitish-item tag-commitish selector-item js-navigation-item js-navigation-target ">
                <span class="mini-icon mini-icon-confirm"></span>
                <h4>
                    <a href="/RobertWHurst/KeyboardJS/blob/v0.0.2/keyboard.js" class="js-navigation-open" data-name="v0.0.2" rel="nofollow">v0.0.2</a>
                </h4>
              </div>
          </div>
        </div>
      </div><!-- /.commitish-context-context -->
    </div>
  </div> <!-- /.scope -->

  <ul class="tabnav-tabs">
    <li><a href="/RobertWHurst/KeyboardJS" class="selected tabnav-tab" highlight="repo_source">Files</a></li>
    <li><a href="/RobertWHurst/KeyboardJS/commits/master" class="tabnav-tab" highlight="repo_commits">Commits</a></li>
    <li><a href="/RobertWHurst/KeyboardJS/branches" class="tabnav-tab" highlight="repo_branches" rel="nofollow">Branches <span class="counter ">3</span></a></li>
  </ul>

</div>

  
  
  


          

        </div><!-- /.repohead -->

        <div id="js-repo-pjax-container" data-pjax-container>
          




<!-- blob contrib key: blob_contributors:v21:93f82397fec4897f110f568ac9af4e74 -->
<!-- blob contrib frag key: views10/v8/blob_contributors:v21:93f82397fec4897f110f568ac9af4e74 -->

<!-- block_view_fragment_key: views10/v8/blob:v21:fc382323f0bccc9f3aa872ed52814ced -->
  <div id="slider">

    <div class="breadcrumb" data-path="keyboard.js/">
      <b itemscope="" itemtype="http://data-vocabulary.org/Breadcrumb"><a href="/RobertWHurst/KeyboardJS/tree/25f0f958cdcacd343d19abae7713111fc6f79c1e" class="js-rewrite-sha" itemprop="url"><span itemprop="title">KeyboardJS</span></a></b> / <strong class="final-path">keyboard.js</strong> <span class="js-clippy mini-icon mini-icon-clippy " data-clipboard-text="keyboard.js" data-copied-hint="copied!" data-copy-hint="copy to clipboard"></span>
    </div>

      
  <div class="commit file-history-tease js-blob-contributors-content" data-path="keyboard.js/">
    <img class="main-avatar" height="24" src="https://secure.gravatar.com/avatar/272bd300efd7a8309df71ac7d5e5b03f?s=140&amp;d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png" width="24" />
    <span class="author"><a href="/RobertWHurst">RobertWHurst</a></span>
    <time class="js-relative-date" datetime="2012-07-09T13:28:54-07:00" title="2012-07-09 13:28:54">July 09, 2012</time>
    <div class="commit-title">
        <a href="/RobertWHurst/KeyboardJS/commit/25f0f958cdcacd343d19abae7713111fc6f79c1e" class="message">KeyboardJS is now aliased with `k`.</a>
    </div>

    <div class="participation">
      <p class="quickstat"><a href="#blob_contributors_box" rel="facebox"><strong>2</strong> contributors</a></p>
          <a class="avatar tooltipped downwards" title="RobertWHurst" href="/RobertWHurst/KeyboardJS/commits/master/keyboard.js?author=RobertWHurst"><img height="20" src="https://secure.gravatar.com/avatar/272bd300efd7a8309df71ac7d5e5b03f?s=140&amp;d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png" width="20" /></a>
    <a class="avatar tooltipped downwards" title="jacobwod" href="/RobertWHurst/KeyboardJS/commits/master/keyboard.js?author=jacobwod"><img height="20" src="https://secure.gravatar.com/avatar/82f22483beaa6269d992138e971a564b?s=140&amp;d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png" width="20" /></a>


    </div>
    <div id="blob_contributors_box" style="display:none">
      <h2>Users on GitHub who have contributed to this file</h2>
      <ul class="facebox-user-list">
        <li>
          <img height="24" src="https://secure.gravatar.com/avatar/272bd300efd7a8309df71ac7d5e5b03f?s=140&amp;d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png" width="24" />
          <a href="/RobertWHurst">RobertWHurst</a>
        </li>
        <li>
          <img height="24" src="https://secure.gravatar.com/avatar/82f22483beaa6269d992138e971a564b?s=140&amp;d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png" width="24" />
          <a href="/jacobwod">jacobwod</a>
        </li>
      </ul>
    </div>
  </div>


    <div class="frames">
      <div class="frame frame-center" data-path="keyboard.js/" data-permalink-url="/RobertWHurst/KeyboardJS/blob/25f0f958cdcacd343d19abae7713111fc6f79c1e/keyboard.js" data-title="KeyboardJS/keyboard.js at master · RobertWHurst/KeyboardJS · GitHub" data-type="blob">

        <div id="files" class="bubble">
          <div class="file">
            <div class="meta">
              <div class="info">
                <span class="icon"><b class="mini-icon mini-icon-text-file"></b></span>
                <span class="mode" title="File Mode">file</span>
                  <span>491 lines (413 sloc)</span>
                <span>12.664 kb</span>
              </div>
              <ul class="button-group actions">
                  <li>
                    <a class="grouped-button file-edit-link minibutton bigger lighter js-rewrite-sha" href="/RobertWHurst/KeyboardJS/edit/25f0f958cdcacd343d19abae7713111fc6f79c1e/keyboard.js" data-method="post" rel="nofollow" data-hotkey="e">Edit</a>
                  </li>
                <li>
                  <a href="/RobertWHurst/KeyboardJS/raw/master/keyboard.js" class="minibutton btn-raw grouped-button bigger lighter" id="raw-url">Raw</a>
                </li>
                  <li>
                    <a href="/RobertWHurst/KeyboardJS/blame/master/keyboard.js" class="minibutton btn-blame grouped-button bigger lighter">Blame</a>
                  </li>
                <li>
                  <a href="/RobertWHurst/KeyboardJS/commits/master/keyboard.js" class="minibutton btn-history grouped-button bigger lighter" rel="nofollow">History</a>
                </li>
              </ul>
            </div>
              <div class="data type-javascript">
      <table cellpadding="0" cellspacing="0" class="lines">
        <tr>
          <td>
            <pre class="line_numbers"><span id="L1" rel="#L1">1</span>
<span id="L2" rel="#L2">2</span>
<span id="L3" rel="#L3">3</span>
<span id="L4" rel="#L4">4</span>
<span id="L5" rel="#L5">5</span>
<span id="L6" rel="#L6">6</span>
<span id="L7" rel="#L7">7</span>
<span id="L8" rel="#L8">8</span>
<span id="L9" rel="#L9">9</span>
<span id="L10" rel="#L10">10</span>
<span id="L11" rel="#L11">11</span>
<span id="L12" rel="#L12">12</span>
<span id="L13" rel="#L13">13</span>
<span id="L14" rel="#L14">14</span>
<span id="L15" rel="#L15">15</span>
<span id="L16" rel="#L16">16</span>
<span id="L17" rel="#L17">17</span>
<span id="L18" rel="#L18">18</span>
<span id="L19" rel="#L19">19</span>
<span id="L20" rel="#L20">20</span>
<span id="L21" rel="#L21">21</span>
<span id="L22" rel="#L22">22</span>
<span id="L23" rel="#L23">23</span>
<span id="L24" rel="#L24">24</span>
<span id="L25" rel="#L25">25</span>
<span id="L26" rel="#L26">26</span>
<span id="L27" rel="#L27">27</span>
<span id="L28" rel="#L28">28</span>
<span id="L29" rel="#L29">29</span>
<span id="L30" rel="#L30">30</span>
<span id="L31" rel="#L31">31</span>
<span id="L32" rel="#L32">32</span>
<span id="L33" rel="#L33">33</span>
<span id="L34" rel="#L34">34</span>
<span id="L35" rel="#L35">35</span>
<span id="L36" rel="#L36">36</span>
<span id="L37" rel="#L37">37</span>
<span id="L38" rel="#L38">38</span>
<span id="L39" rel="#L39">39</span>
<span id="L40" rel="#L40">40</span>
<span id="L41" rel="#L41">41</span>
<span id="L42" rel="#L42">42</span>
<span id="L43" rel="#L43">43</span>
<span id="L44" rel="#L44">44</span>
<span id="L45" rel="#L45">45</span>
<span id="L46" rel="#L46">46</span>
<span id="L47" rel="#L47">47</span>
<span id="L48" rel="#L48">48</span>
<span id="L49" rel="#L49">49</span>
<span id="L50" rel="#L50">50</span>
<span id="L51" rel="#L51">51</span>
<span id="L52" rel="#L52">52</span>
<span id="L53" rel="#L53">53</span>
<span id="L54" rel="#L54">54</span>
<span id="L55" rel="#L55">55</span>
<span id="L56" rel="#L56">56</span>
<span id="L57" rel="#L57">57</span>
<span id="L58" rel="#L58">58</span>
<span id="L59" rel="#L59">59</span>
<span id="L60" rel="#L60">60</span>
<span id="L61" rel="#L61">61</span>
<span id="L62" rel="#L62">62</span>
<span id="L63" rel="#L63">63</span>
<span id="L64" rel="#L64">64</span>
<span id="L65" rel="#L65">65</span>
<span id="L66" rel="#L66">66</span>
<span id="L67" rel="#L67">67</span>
<span id="L68" rel="#L68">68</span>
<span id="L69" rel="#L69">69</span>
<span id="L70" rel="#L70">70</span>
<span id="L71" rel="#L71">71</span>
<span id="L72" rel="#L72">72</span>
<span id="L73" rel="#L73">73</span>
<span id="L74" rel="#L74">74</span>
<span id="L75" rel="#L75">75</span>
<span id="L76" rel="#L76">76</span>
<span id="L77" rel="#L77">77</span>
<span id="L78" rel="#L78">78</span>
<span id="L79" rel="#L79">79</span>
<span id="L80" rel="#L80">80</span>
<span id="L81" rel="#L81">81</span>
<span id="L82" rel="#L82">82</span>
<span id="L83" rel="#L83">83</span>
<span id="L84" rel="#L84">84</span>
<span id="L85" rel="#L85">85</span>
<span id="L86" rel="#L86">86</span>
<span id="L87" rel="#L87">87</span>
<span id="L88" rel="#L88">88</span>
<span id="L89" rel="#L89">89</span>
<span id="L90" rel="#L90">90</span>
<span id="L91" rel="#L91">91</span>
<span id="L92" rel="#L92">92</span>
<span id="L93" rel="#L93">93</span>
<span id="L94" rel="#L94">94</span>
<span id="L95" rel="#L95">95</span>
<span id="L96" rel="#L96">96</span>
<span id="L97" rel="#L97">97</span>
<span id="L98" rel="#L98">98</span>
<span id="L99" rel="#L99">99</span>
<span id="L100" rel="#L100">100</span>
<span id="L101" rel="#L101">101</span>
<span id="L102" rel="#L102">102</span>
<span id="L103" rel="#L103">103</span>
<span id="L104" rel="#L104">104</span>
<span id="L105" rel="#L105">105</span>
<span id="L106" rel="#L106">106</span>
<span id="L107" rel="#L107">107</span>
<span id="L108" rel="#L108">108</span>
<span id="L109" rel="#L109">109</span>
<span id="L110" rel="#L110">110</span>
<span id="L111" rel="#L111">111</span>
<span id="L112" rel="#L112">112</span>
<span id="L113" rel="#L113">113</span>
<span id="L114" rel="#L114">114</span>
<span id="L115" rel="#L115">115</span>
<span id="L116" rel="#L116">116</span>
<span id="L117" rel="#L117">117</span>
<span id="L118" rel="#L118">118</span>
<span id="L119" rel="#L119">119</span>
<span id="L120" rel="#L120">120</span>
<span id="L121" rel="#L121">121</span>
<span id="L122" rel="#L122">122</span>
<span id="L123" rel="#L123">123</span>
<span id="L124" rel="#L124">124</span>
<span id="L125" rel="#L125">125</span>
<span id="L126" rel="#L126">126</span>
<span id="L127" rel="#L127">127</span>
<span id="L128" rel="#L128">128</span>
<span id="L129" rel="#L129">129</span>
<span id="L130" rel="#L130">130</span>
<span id="L131" rel="#L131">131</span>
<span id="L132" rel="#L132">132</span>
<span id="L133" rel="#L133">133</span>
<span id="L134" rel="#L134">134</span>
<span id="L135" rel="#L135">135</span>
<span id="L136" rel="#L136">136</span>
<span id="L137" rel="#L137">137</span>
<span id="L138" rel="#L138">138</span>
<span id="L139" rel="#L139">139</span>
<span id="L140" rel="#L140">140</span>
<span id="L141" rel="#L141">141</span>
<span id="L142" rel="#L142">142</span>
<span id="L143" rel="#L143">143</span>
<span id="L144" rel="#L144">144</span>
<span id="L145" rel="#L145">145</span>
<span id="L146" rel="#L146">146</span>
<span id="L147" rel="#L147">147</span>
<span id="L148" rel="#L148">148</span>
<span id="L149" rel="#L149">149</span>
<span id="L150" rel="#L150">150</span>
<span id="L151" rel="#L151">151</span>
<span id="L152" rel="#L152">152</span>
<span id="L153" rel="#L153">153</span>
<span id="L154" rel="#L154">154</span>
<span id="L155" rel="#L155">155</span>
<span id="L156" rel="#L156">156</span>
<span id="L157" rel="#L157">157</span>
<span id="L158" rel="#L158">158</span>
<span id="L159" rel="#L159">159</span>
<span id="L160" rel="#L160">160</span>
<span id="L161" rel="#L161">161</span>
<span id="L162" rel="#L162">162</span>
<span id="L163" rel="#L163">163</span>
<span id="L164" rel="#L164">164</span>
<span id="L165" rel="#L165">165</span>
<span id="L166" rel="#L166">166</span>
<span id="L167" rel="#L167">167</span>
<span id="L168" rel="#L168">168</span>
<span id="L169" rel="#L169">169</span>
<span id="L170" rel="#L170">170</span>
<span id="L171" rel="#L171">171</span>
<span id="L172" rel="#L172">172</span>
<span id="L173" rel="#L173">173</span>
<span id="L174" rel="#L174">174</span>
<span id="L175" rel="#L175">175</span>
<span id="L176" rel="#L176">176</span>
<span id="L177" rel="#L177">177</span>
<span id="L178" rel="#L178">178</span>
<span id="L179" rel="#L179">179</span>
<span id="L180" rel="#L180">180</span>
<span id="L181" rel="#L181">181</span>
<span id="L182" rel="#L182">182</span>
<span id="L183" rel="#L183">183</span>
<span id="L184" rel="#L184">184</span>
<span id="L185" rel="#L185">185</span>
<span id="L186" rel="#L186">186</span>
<span id="L187" rel="#L187">187</span>
<span id="L188" rel="#L188">188</span>
<span id="L189" rel="#L189">189</span>
<span id="L190" rel="#L190">190</span>
<span id="L191" rel="#L191">191</span>
<span id="L192" rel="#L192">192</span>
<span id="L193" rel="#L193">193</span>
<span id="L194" rel="#L194">194</span>
<span id="L195" rel="#L195">195</span>
<span id="L196" rel="#L196">196</span>
<span id="L197" rel="#L197">197</span>
<span id="L198" rel="#L198">198</span>
<span id="L199" rel="#L199">199</span>
<span id="L200" rel="#L200">200</span>
<span id="L201" rel="#L201">201</span>
<span id="L202" rel="#L202">202</span>
<span id="L203" rel="#L203">203</span>
<span id="L204" rel="#L204">204</span>
<span id="L205" rel="#L205">205</span>
<span id="L206" rel="#L206">206</span>
<span id="L207" rel="#L207">207</span>
<span id="L208" rel="#L208">208</span>
<span id="L209" rel="#L209">209</span>
<span id="L210" rel="#L210">210</span>
<span id="L211" rel="#L211">211</span>
<span id="L212" rel="#L212">212</span>
<span id="L213" rel="#L213">213</span>
<span id="L214" rel="#L214">214</span>
<span id="L215" rel="#L215">215</span>
<span id="L216" rel="#L216">216</span>
<span id="L217" rel="#L217">217</span>
<span id="L218" rel="#L218">218</span>
<span id="L219" rel="#L219">219</span>
<span id="L220" rel="#L220">220</span>
<span id="L221" rel="#L221">221</span>
<span id="L222" rel="#L222">222</span>
<span id="L223" rel="#L223">223</span>
<span id="L224" rel="#L224">224</span>
<span id="L225" rel="#L225">225</span>
<span id="L226" rel="#L226">226</span>
<span id="L227" rel="#L227">227</span>
<span id="L228" rel="#L228">228</span>
<span id="L229" rel="#L229">229</span>
<span id="L230" rel="#L230">230</span>
<span id="L231" rel="#L231">231</span>
<span id="L232" rel="#L232">232</span>
<span id="L233" rel="#L233">233</span>
<span id="L234" rel="#L234">234</span>
<span id="L235" rel="#L235">235</span>
<span id="L236" rel="#L236">236</span>
<span id="L237" rel="#L237">237</span>
<span id="L238" rel="#L238">238</span>
<span id="L239" rel="#L239">239</span>
<span id="L240" rel="#L240">240</span>
<span id="L241" rel="#L241">241</span>
<span id="L242" rel="#L242">242</span>
<span id="L243" rel="#L243">243</span>
<span id="L244" rel="#L244">244</span>
<span id="L245" rel="#L245">245</span>
<span id="L246" rel="#L246">246</span>
<span id="L247" rel="#L247">247</span>
<span id="L248" rel="#L248">248</span>
<span id="L249" rel="#L249">249</span>
<span id="L250" rel="#L250">250</span>
<span id="L251" rel="#L251">251</span>
<span id="L252" rel="#L252">252</span>
<span id="L253" rel="#L253">253</span>
<span id="L254" rel="#L254">254</span>
<span id="L255" rel="#L255">255</span>
<span id="L256" rel="#L256">256</span>
<span id="L257" rel="#L257">257</span>
<span id="L258" rel="#L258">258</span>
<span id="L259" rel="#L259">259</span>
<span id="L260" rel="#L260">260</span>
<span id="L261" rel="#L261">261</span>
<span id="L262" rel="#L262">262</span>
<span id="L263" rel="#L263">263</span>
<span id="L264" rel="#L264">264</span>
<span id="L265" rel="#L265">265</span>
<span id="L266" rel="#L266">266</span>
<span id="L267" rel="#L267">267</span>
<span id="L268" rel="#L268">268</span>
<span id="L269" rel="#L269">269</span>
<span id="L270" rel="#L270">270</span>
<span id="L271" rel="#L271">271</span>
<span id="L272" rel="#L272">272</span>
<span id="L273" rel="#L273">273</span>
<span id="L274" rel="#L274">274</span>
<span id="L275" rel="#L275">275</span>
<span id="L276" rel="#L276">276</span>
<span id="L277" rel="#L277">277</span>
<span id="L278" rel="#L278">278</span>
<span id="L279" rel="#L279">279</span>
<span id="L280" rel="#L280">280</span>
<span id="L281" rel="#L281">281</span>
<span id="L282" rel="#L282">282</span>
<span id="L283" rel="#L283">283</span>
<span id="L284" rel="#L284">284</span>
<span id="L285" rel="#L285">285</span>
<span id="L286" rel="#L286">286</span>
<span id="L287" rel="#L287">287</span>
<span id="L288" rel="#L288">288</span>
<span id="L289" rel="#L289">289</span>
<span id="L290" rel="#L290">290</span>
<span id="L291" rel="#L291">291</span>
<span id="L292" rel="#L292">292</span>
<span id="L293" rel="#L293">293</span>
<span id="L294" rel="#L294">294</span>
<span id="L295" rel="#L295">295</span>
<span id="L296" rel="#L296">296</span>
<span id="L297" rel="#L297">297</span>
<span id="L298" rel="#L298">298</span>
<span id="L299" rel="#L299">299</span>
<span id="L300" rel="#L300">300</span>
<span id="L301" rel="#L301">301</span>
<span id="L302" rel="#L302">302</span>
<span id="L303" rel="#L303">303</span>
<span id="L304" rel="#L304">304</span>
<span id="L305" rel="#L305">305</span>
<span id="L306" rel="#L306">306</span>
<span id="L307" rel="#L307">307</span>
<span id="L308" rel="#L308">308</span>
<span id="L309" rel="#L309">309</span>
<span id="L310" rel="#L310">310</span>
<span id="L311" rel="#L311">311</span>
<span id="L312" rel="#L312">312</span>
<span id="L313" rel="#L313">313</span>
<span id="L314" rel="#L314">314</span>
<span id="L315" rel="#L315">315</span>
<span id="L316" rel="#L316">316</span>
<span id="L317" rel="#L317">317</span>
<span id="L318" rel="#L318">318</span>
<span id="L319" rel="#L319">319</span>
<span id="L320" rel="#L320">320</span>
<span id="L321" rel="#L321">321</span>
<span id="L322" rel="#L322">322</span>
<span id="L323" rel="#L323">323</span>
<span id="L324" rel="#L324">324</span>
<span id="L325" rel="#L325">325</span>
<span id="L326" rel="#L326">326</span>
<span id="L327" rel="#L327">327</span>
<span id="L328" rel="#L328">328</span>
<span id="L329" rel="#L329">329</span>
<span id="L330" rel="#L330">330</span>
<span id="L331" rel="#L331">331</span>
<span id="L332" rel="#L332">332</span>
<span id="L333" rel="#L333">333</span>
<span id="L334" rel="#L334">334</span>
<span id="L335" rel="#L335">335</span>
<span id="L336" rel="#L336">336</span>
<span id="L337" rel="#L337">337</span>
<span id="L338" rel="#L338">338</span>
<span id="L339" rel="#L339">339</span>
<span id="L340" rel="#L340">340</span>
<span id="L341" rel="#L341">341</span>
<span id="L342" rel="#L342">342</span>
<span id="L343" rel="#L343">343</span>
<span id="L344" rel="#L344">344</span>
<span id="L345" rel="#L345">345</span>
<span id="L346" rel="#L346">346</span>
<span id="L347" rel="#L347">347</span>
<span id="L348" rel="#L348">348</span>
<span id="L349" rel="#L349">349</span>
<span id="L350" rel="#L350">350</span>
<span id="L351" rel="#L351">351</span>
<span id="L352" rel="#L352">352</span>
<span id="L353" rel="#L353">353</span>
<span id="L354" rel="#L354">354</span>
<span id="L355" rel="#L355">355</span>
<span id="L356" rel="#L356">356</span>
<span id="L357" rel="#L357">357</span>
<span id="L358" rel="#L358">358</span>
<span id="L359" rel="#L359">359</span>
<span id="L360" rel="#L360">360</span>
<span id="L361" rel="#L361">361</span>
<span id="L362" rel="#L362">362</span>
<span id="L363" rel="#L363">363</span>
<span id="L364" rel="#L364">364</span>
<span id="L365" rel="#L365">365</span>
<span id="L366" rel="#L366">366</span>
<span id="L367" rel="#L367">367</span>
<span id="L368" rel="#L368">368</span>
<span id="L369" rel="#L369">369</span>
<span id="L370" rel="#L370">370</span>
<span id="L371" rel="#L371">371</span>
<span id="L372" rel="#L372">372</span>
<span id="L373" rel="#L373">373</span>
<span id="L374" rel="#L374">374</span>
<span id="L375" rel="#L375">375</span>
<span id="L376" rel="#L376">376</span>
<span id="L377" rel="#L377">377</span>
<span id="L378" rel="#L378">378</span>
<span id="L379" rel="#L379">379</span>
<span id="L380" rel="#L380">380</span>
<span id="L381" rel="#L381">381</span>
<span id="L382" rel="#L382">382</span>
<span id="L383" rel="#L383">383</span>
<span id="L384" rel="#L384">384</span>
<span id="L385" rel="#L385">385</span>
<span id="L386" rel="#L386">386</span>
<span id="L387" rel="#L387">387</span>
<span id="L388" rel="#L388">388</span>
<span id="L389" rel="#L389">389</span>
<span id="L390" rel="#L390">390</span>
<span id="L391" rel="#L391">391</span>
<span id="L392" rel="#L392">392</span>
<span id="L393" rel="#L393">393</span>
<span id="L394" rel="#L394">394</span>
<span id="L395" rel="#L395">395</span>
<span id="L396" rel="#L396">396</span>
<span id="L397" rel="#L397">397</span>
<span id="L398" rel="#L398">398</span>
<span id="L399" rel="#L399">399</span>
<span id="L400" rel="#L400">400</span>
<span id="L401" rel="#L401">401</span>
<span id="L402" rel="#L402">402</span>
<span id="L403" rel="#L403">403</span>
<span id="L404" rel="#L404">404</span>
<span id="L405" rel="#L405">405</span>
<span id="L406" rel="#L406">406</span>
<span id="L407" rel="#L407">407</span>
<span id="L408" rel="#L408">408</span>
<span id="L409" rel="#L409">409</span>
<span id="L410" rel="#L410">410</span>
<span id="L411" rel="#L411">411</span>
<span id="L412" rel="#L412">412</span>
<span id="L413" rel="#L413">413</span>
<span id="L414" rel="#L414">414</span>
<span id="L415" rel="#L415">415</span>
<span id="L416" rel="#L416">416</span>
<span id="L417" rel="#L417">417</span>
<span id="L418" rel="#L418">418</span>
<span id="L419" rel="#L419">419</span>
<span id="L420" rel="#L420">420</span>
<span id="L421" rel="#L421">421</span>
<span id="L422" rel="#L422">422</span>
<span id="L423" rel="#L423">423</span>
<span id="L424" rel="#L424">424</span>
<span id="L425" rel="#L425">425</span>
<span id="L426" rel="#L426">426</span>
<span id="L427" rel="#L427">427</span>
<span id="L428" rel="#L428">428</span>
<span id="L429" rel="#L429">429</span>
<span id="L430" rel="#L430">430</span>
<span id="L431" rel="#L431">431</span>
<span id="L432" rel="#L432">432</span>
<span id="L433" rel="#L433">433</span>
<span id="L434" rel="#L434">434</span>
<span id="L435" rel="#L435">435</span>
<span id="L436" rel="#L436">436</span>
<span id="L437" rel="#L437">437</span>
<span id="L438" rel="#L438">438</span>
<span id="L439" rel="#L439">439</span>
<span id="L440" rel="#L440">440</span>
<span id="L441" rel="#L441">441</span>
<span id="L442" rel="#L442">442</span>
<span id="L443" rel="#L443">443</span>
<span id="L444" rel="#L444">444</span>
<span id="L445" rel="#L445">445</span>
<span id="L446" rel="#L446">446</span>
<span id="L447" rel="#L447">447</span>
<span id="L448" rel="#L448">448</span>
<span id="L449" rel="#L449">449</span>
<span id="L450" rel="#L450">450</span>
<span id="L451" rel="#L451">451</span>
<span id="L452" rel="#L452">452</span>
<span id="L453" rel="#L453">453</span>
<span id="L454" rel="#L454">454</span>
<span id="L455" rel="#L455">455</span>
<span id="L456" rel="#L456">456</span>
<span id="L457" rel="#L457">457</span>
<span id="L458" rel="#L458">458</span>
<span id="L459" rel="#L459">459</span>
<span id="L460" rel="#L460">460</span>
<span id="L461" rel="#L461">461</span>
<span id="L462" rel="#L462">462</span>
<span id="L463" rel="#L463">463</span>
<span id="L464" rel="#L464">464</span>
<span id="L465" rel="#L465">465</span>
<span id="L466" rel="#L466">466</span>
<span id="L467" rel="#L467">467</span>
<span id="L468" rel="#L468">468</span>
<span id="L469" rel="#L469">469</span>
<span id="L470" rel="#L470">470</span>
<span id="L471" rel="#L471">471</span>
<span id="L472" rel="#L472">472</span>
<span id="L473" rel="#L473">473</span>
<span id="L474" rel="#L474">474</span>
<span id="L475" rel="#L475">475</span>
<span id="L476" rel="#L476">476</span>
<span id="L477" rel="#L477">477</span>
<span id="L478" rel="#L478">478</span>
<span id="L479" rel="#L479">479</span>
<span id="L480" rel="#L480">480</span>
<span id="L481" rel="#L481">481</span>
<span id="L482" rel="#L482">482</span>
<span id="L483" rel="#L483">483</span>
<span id="L484" rel="#L484">484</span>
<span id="L485" rel="#L485">485</span>
<span id="L486" rel="#L486">486</span>
<span id="L487" rel="#L487">487</span>
<span id="L488" rel="#L488">488</span>
<span id="L489" rel="#L489">489</span>
<span id="L490" rel="#L490">490</span>
<span id="L491" rel="#L491">491</span>
</pre>
          </td>
          <td width="100%">
                <div class="highlight"><pre><div class='line' id='LC1'><span class="cm">/*!</span></div><div class='line' id='LC2'><span class="cm"> * KeyboardJS</span></div><div class='line' id='LC3'><span class="cm"> * </span></div><div class='line' id='LC4'><span class="cm"> * Copyright 2011, Robert William Hurst</span></div><div class='line' id='LC5'><span class="cm"> * Licenced under the BSD License.</span></div><div class='line' id='LC6'><span class="cm"> * See https://raw.github.com/RobertWHurst/KeyboardJS/master/license.txt</span></div><div class='line' id='LC7'><span class="cm"> */</span></div><div class='line' id='LC8'><span class="p">(</span><span class="kd">function</span> <span class="p">(</span><span class="nx">context</span><span class="p">,</span> <span class="nx">factory</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC9'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="k">if</span> <span class="p">(</span><span class="k">typeof</span> <span class="nx">define</span> <span class="o">===</span> <span class="s1">&#39;function&#39;</span> <span class="o">&amp;&amp;</span> <span class="nx">define</span><span class="p">.</span><span class="nx">amd</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC10'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="c1">// AMD. Register as an anonymous module.</span></div><div class='line' id='LC11'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="nx">define</span><span class="p">(</span><span class="nx">factory</span><span class="p">);</span></div><div class='line' id='LC12'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span> <span class="k">else</span> <span class="p">{</span></div><div class='line' id='LC13'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="c1">// Browser globals</span></div><div class='line' id='LC14'>	    <span class="nx">context</span><span class="p">.</span><span class="nx">k</span> <span class="o">=</span> <span class="nx">context</span><span class="p">.</span><span class="nx">KeyboardJS</span> <span class="o">=</span> <span class="nx">factory</span><span class="p">();</span></div><div class='line' id='LC15'>&nbsp;&nbsp;&nbsp;&nbsp;<span class="p">}</span></div><div class='line' id='LC16'><span class="p">}(</span><span class="k">this</span><span class="p">,</span> <span class="kd">function</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC17'><br/></div><div class='line' id='LC18'>	<span class="c1">//polyfills for ms&#39;s peice o&#39; shit browsers</span></div><div class='line' id='LC19'>	<span class="kd">function</span> <span class="nx">bind</span><span class="p">(</span><span class="nx">target</span><span class="p">,</span> <span class="nx">type</span><span class="p">,</span> <span class="nx">handler</span><span class="p">)</span> <span class="p">{</span> <span class="k">if</span> <span class="p">(</span><span class="nx">target</span><span class="p">.</span><span class="nx">addEventListener</span><span class="p">)</span> <span class="p">{</span> <span class="nx">target</span><span class="p">.</span><span class="nx">addEventListener</span><span class="p">(</span><span class="nx">type</span><span class="p">,</span> <span class="nx">handler</span><span class="p">,</span> <span class="kc">false</span><span class="p">);</span> <span class="p">}</span> <span class="k">else</span> <span class="p">{</span> <span class="nx">target</span><span class="p">.</span><span class="nx">attachEvent</span><span class="p">(</span><span class="s2">&quot;on&quot;</span> <span class="o">+</span> <span class="nx">type</span><span class="p">,</span> <span class="kd">function</span><span class="p">(</span><span class="nx">event</span><span class="p">)</span> <span class="p">{</span> <span class="k">return</span> <span class="nx">handler</span><span class="p">.</span><span class="nx">call</span><span class="p">(</span><span class="nx">target</span><span class="p">,</span> <span class="nx">event</span><span class="p">);</span> <span class="p">});</span><span class="err"> </span><span class="p">}</span> <span class="p">}</span></div><div class='line' id='LC20'>	<span class="p">[].</span><span class="nx">indexOf</span><span class="o">||</span><span class="p">(</span><span class="nb">Array</span><span class="p">.</span><span class="nx">prototype</span><span class="p">.</span><span class="nx">indexOf</span><span class="o">=</span><span class="kd">function</span><span class="p">(</span><span class="nx">a</span><span class="p">,</span><span class="nx">b</span><span class="p">,</span><span class="nx">c</span><span class="p">){</span><span class="k">for</span><span class="p">(</span><span class="nx">c</span><span class="o">=</span><span class="k">this</span><span class="p">.</span><span class="nx">length</span><span class="p">,</span><span class="nx">b</span><span class="o">=</span><span class="p">(</span><span class="nx">c</span><span class="o">+~~</span><span class="nx">b</span><span class="p">)</span><span class="o">%</span><span class="nx">c</span><span class="p">;</span><span class="nx">b</span><span class="o">&lt;</span><span class="nx">c</span><span class="o">&amp;&amp;</span><span class="p">(</span><span class="o">!</span><span class="p">(</span><span class="nx">b</span> <span class="k">in</span> <span class="k">this</span><span class="p">)</span><span class="o">||</span><span class="k">this</span><span class="p">[</span><span class="nx">b</span><span class="p">]</span><span class="o">!==</span><span class="nx">a</span><span class="p">);</span><span class="nx">b</span><span class="o">++</span><span class="p">);</span><span class="k">return</span> <span class="nx">b</span><span class="o">^</span><span class="nx">c</span><span class="o">?</span><span class="nx">b</span><span class="o">:-</span><span class="mi">1</span><span class="p">;});</span></div><div class='line' id='LC21'><br/></div><div class='line' id='LC22'>	<span class="c1">//locals</span></div><div class='line' id='LC23'>	<span class="kd">var</span> <span class="nx">locals</span> <span class="o">=</span> <span class="p">{</span></div><div class='line' id='LC24'>		<span class="s1">&#39;us&#39;</span><span class="o">:</span> <span class="p">{</span></div><div class='line' id='LC25'>			<span class="s2">&quot;backspace&quot;</span><span class="o">:</span> <span class="mi">8</span><span class="p">,</span></div><div class='line' id='LC26'>			<span class="s2">&quot;tab&quot;</span><span class="o">:</span> <span class="mi">9</span><span class="p">,</span></div><div class='line' id='LC27'>			<span class="s2">&quot;enter&quot;</span><span class="o">:</span> <span class="mi">13</span><span class="p">,</span></div><div class='line' id='LC28'>			<span class="s2">&quot;shift&quot;</span><span class="o">:</span> <span class="mi">16</span><span class="p">,</span></div><div class='line' id='LC29'>			<span class="s2">&quot;ctrl&quot;</span><span class="o">:</span> <span class="mi">17</span><span class="p">,</span></div><div class='line' id='LC30'>			<span class="s2">&quot;alt&quot;</span><span class="o">:</span> <span class="mi">18</span><span class="p">,</span></div><div class='line' id='LC31'>			<span class="s2">&quot;pause&quot;</span><span class="o">:</span> <span class="mi">19</span><span class="p">,</span> <span class="s2">&quot;break&quot;</span><span class="o">:</span> <span class="mi">19</span><span class="p">,</span></div><div class='line' id='LC32'>			<span class="s2">&quot;capslock&quot;</span><span class="o">:</span> <span class="mi">20</span><span class="p">,</span></div><div class='line' id='LC33'>			<span class="s2">&quot;escape&quot;</span><span class="o">:</span> <span class="mi">27</span><span class="p">,</span> <span class="s2">&quot;esc&quot;</span><span class="o">:</span> <span class="mi">27</span><span class="p">,</span></div><div class='line' id='LC34'>			<span class="s2">&quot;space&quot;</span><span class="o">:</span> <span class="mi">32</span><span class="p">,</span> <span class="s2">&quot;spacebar&quot;</span><span class="o">:</span> <span class="mi">32</span><span class="p">,</span></div><div class='line' id='LC35'>			<span class="s2">&quot;pageup&quot;</span><span class="o">:</span> <span class="mi">33</span><span class="p">,</span></div><div class='line' id='LC36'>			<span class="s2">&quot;pagedown&quot;</span><span class="o">:</span> <span class="mi">34</span><span class="p">,</span></div><div class='line' id='LC37'>			<span class="s2">&quot;end&quot;</span><span class="o">:</span> <span class="mi">35</span><span class="p">,</span></div><div class='line' id='LC38'>			<span class="s2">&quot;home&quot;</span><span class="o">:</span> <span class="mi">36</span><span class="p">,</span></div><div class='line' id='LC39'>			<span class="s2">&quot;left&quot;</span><span class="o">:</span> <span class="mi">37</span><span class="p">,</span></div><div class='line' id='LC40'>			<span class="s2">&quot;up&quot;</span><span class="o">:</span> <span class="mi">38</span><span class="p">,</span></div><div class='line' id='LC41'>			<span class="s2">&quot;right&quot;</span><span class="o">:</span> <span class="mi">39</span><span class="p">,</span></div><div class='line' id='LC42'>			<span class="s2">&quot;down&quot;</span><span class="o">:</span> <span class="mi">40</span><span class="p">,</span></div><div class='line' id='LC43'>			<span class="s2">&quot;insert&quot;</span><span class="o">:</span> <span class="mi">45</span><span class="p">,</span></div><div class='line' id='LC44'>			<span class="s2">&quot;delete&quot;</span><span class="o">:</span> <span class="mi">46</span><span class="p">,</span></div><div class='line' id='LC45'>			<span class="s2">&quot;0&quot;</span><span class="o">:</span> <span class="mi">48</span><span class="p">,</span> <span class="s2">&quot;1&quot;</span><span class="o">:</span> <span class="mi">49</span><span class="p">,</span> <span class="s2">&quot;2&quot;</span><span class="o">:</span> <span class="mi">50</span><span class="p">,</span> <span class="s2">&quot;3&quot;</span><span class="o">:</span> <span class="mi">51</span><span class="p">,</span> <span class="s2">&quot;4&quot;</span><span class="o">:</span> <span class="mi">52</span><span class="p">,</span> <span class="s2">&quot;5&quot;</span><span class="o">:</span> <span class="mi">53</span><span class="p">,</span> <span class="s2">&quot;6&quot;</span><span class="o">:</span> <span class="mi">54</span><span class="p">,</span> <span class="s2">&quot;7&quot;</span><span class="o">:</span> <span class="mi">55</span><span class="p">,</span> <span class="s2">&quot;8&quot;</span><span class="o">:</span> <span class="mi">56</span><span class="p">,</span> <span class="s2">&quot;9&quot;</span><span class="o">:</span> <span class="mi">57</span><span class="p">,</span></div><div class='line' id='LC46'>			<span class="s2">&quot;a&quot;</span><span class="o">:</span> <span class="mi">65</span><span class="p">,</span> <span class="s2">&quot;b&quot;</span><span class="o">:</span> <span class="mi">66</span><span class="p">,</span> <span class="s2">&quot;c&quot;</span><span class="o">:</span> <span class="mi">67</span><span class="p">,</span> <span class="s2">&quot;d&quot;</span><span class="o">:</span> <span class="mi">68</span><span class="p">,</span> <span class="s2">&quot;e&quot;</span><span class="o">:</span> <span class="mi">69</span><span class="p">,</span> <span class="s2">&quot;f&quot;</span><span class="o">:</span> <span class="mi">70</span><span class="p">,</span> <span class="s2">&quot;g&quot;</span><span class="o">:</span> <span class="mi">71</span><span class="p">,</span> <span class="s2">&quot;h&quot;</span><span class="o">:</span> <span class="mi">72</span><span class="p">,</span> <span class="s2">&quot;i&quot;</span><span class="o">:</span> <span class="mi">73</span><span class="p">,</span> <span class="s2">&quot;j&quot;</span><span class="o">:</span> <span class="mi">74</span><span class="p">,</span> <span class="s2">&quot;k&quot;</span><span class="o">:</span> <span class="mi">75</span><span class="p">,</span> <span class="s2">&quot;l&quot;</span><span class="o">:</span> <span class="mi">76</span><span class="p">,</span> <span class="s2">&quot;m&quot;</span><span class="o">:</span> <span class="mi">77</span><span class="p">,</span> <span class="s2">&quot;n&quot;</span><span class="o">:</span> <span class="mi">78</span><span class="p">,</span> <span class="s2">&quot;o&quot;</span><span class="o">:</span> <span class="mi">79</span><span class="p">,</span> <span class="s2">&quot;p&quot;</span><span class="o">:</span> <span class="mi">80</span><span class="p">,</span> <span class="s2">&quot;q&quot;</span><span class="o">:</span> <span class="mi">81</span><span class="p">,</span> <span class="s2">&quot;r&quot;</span><span class="o">:</span> <span class="mi">82</span><span class="p">,</span> <span class="s2">&quot;s&quot;</span><span class="o">:</span> <span class="mi">83</span><span class="p">,</span> <span class="s2">&quot;t&quot;</span><span class="o">:</span> <span class="mi">84</span><span class="p">,</span> <span class="s2">&quot;u&quot;</span><span class="o">:</span> <span class="mi">85</span><span class="p">,</span> <span class="s2">&quot;v&quot;</span><span class="o">:</span> <span class="mi">86</span><span class="p">,</span> <span class="s2">&quot;w&quot;</span><span class="o">:</span> <span class="mi">87</span><span class="p">,</span> <span class="s2">&quot;x&quot;</span><span class="o">:</span> <span class="mi">88</span><span class="p">,</span> <span class="s2">&quot;y&quot;</span><span class="o">:</span> <span class="mi">89</span><span class="p">,</span> <span class="s2">&quot;z&quot;</span><span class="o">:</span> <span class="mi">90</span><span class="p">,</span></div><div class='line' id='LC47'>			<span class="s2">&quot;meta&quot;</span><span class="o">:</span> <span class="mi">91</span><span class="p">,</span> <span class="s2">&quot;command&quot;</span><span class="o">:</span> <span class="mi">91</span><span class="p">,</span> <span class="s2">&quot;windows&quot;</span><span class="o">:</span> <span class="mi">91</span><span class="p">,</span> <span class="s2">&quot;win&quot;</span><span class="o">:</span> <span class="mi">91</span><span class="p">,</span></div><div class='line' id='LC48'>			<span class="s2">&quot;_91&quot;</span><span class="o">:</span> <span class="mi">92</span><span class="p">,</span></div><div class='line' id='LC49'>			<span class="s2">&quot;select&quot;</span><span class="o">:</span> <span class="mi">93</span><span class="p">,</span></div><div class='line' id='LC50'>			<span class="s2">&quot;num0&quot;</span><span class="o">:</span> <span class="mi">96</span><span class="p">,</span> <span class="s2">&quot;num1&quot;</span><span class="o">:</span> <span class="mi">97</span><span class="p">,</span> <span class="s2">&quot;num2&quot;</span><span class="o">:</span> <span class="mi">98</span><span class="p">,</span> <span class="s2">&quot;num3&quot;</span><span class="o">:</span> <span class="mi">99</span><span class="p">,</span> <span class="s2">&quot;num4&quot;</span><span class="o">:</span> <span class="mi">100</span><span class="p">,</span> <span class="s2">&quot;num5&quot;</span><span class="o">:</span> <span class="mi">101</span><span class="p">,</span> <span class="s2">&quot;num6&quot;</span><span class="o">:</span> <span class="mi">102</span><span class="p">,</span> <span class="s2">&quot;num7&quot;</span><span class="o">:</span> <span class="mi">103</span><span class="p">,</span> <span class="s2">&quot;num8&quot;</span><span class="o">:</span> <span class="mi">104</span><span class="p">,</span> <span class="s2">&quot;num9&quot;</span><span class="o">:</span> <span class="mi">105</span><span class="p">,</span></div><div class='line' id='LC51'>			<span class="s2">&quot;multiply&quot;</span><span class="o">:</span> <span class="mi">106</span><span class="p">,</span></div><div class='line' id='LC52'>			<span class="s2">&quot;add&quot;</span><span class="o">:</span> <span class="mi">107</span><span class="p">,</span></div><div class='line' id='LC53'>			<span class="s2">&quot;subtract&quot;</span><span class="o">:</span> <span class="mi">109</span><span class="p">,</span></div><div class='line' id='LC54'>			<span class="s2">&quot;decimal&quot;</span><span class="o">:</span> <span class="mi">110</span><span class="p">,</span></div><div class='line' id='LC55'>			<span class="s2">&quot;divide&quot;</span><span class="o">:</span> <span class="mi">111</span><span class="p">,</span></div><div class='line' id='LC56'>			<span class="s2">&quot;f1&quot;</span><span class="o">:</span> <span class="mi">112</span><span class="p">,</span> <span class="s2">&quot;f2&quot;</span><span class="o">:</span> <span class="mi">113</span><span class="p">,</span> <span class="s2">&quot;f3&quot;</span><span class="o">:</span> <span class="mi">114</span><span class="p">,</span> <span class="s2">&quot;f4&quot;</span><span class="o">:</span> <span class="mi">115</span><span class="p">,</span> <span class="s2">&quot;f5&quot;</span><span class="o">:</span> <span class="mi">116</span><span class="p">,</span> <span class="s2">&quot;f6&quot;</span><span class="o">:</span> <span class="mi">117</span><span class="p">,</span> <span class="s2">&quot;f7&quot;</span><span class="o">:</span> <span class="mi">118</span><span class="p">,</span> <span class="s2">&quot;f8&quot;</span><span class="o">:</span> <span class="mi">119</span><span class="p">,</span> <span class="s2">&quot;f9&quot;</span><span class="o">:</span> <span class="mi">120</span><span class="p">,</span> <span class="s2">&quot;f10&quot;</span><span class="o">:</span> <span class="mi">121</span><span class="p">,</span> <span class="s2">&quot;f11&quot;</span><span class="o">:</span> <span class="mi">122</span><span class="p">,</span> <span class="s2">&quot;f12&quot;</span><span class="o">:</span> <span class="mi">123</span><span class="p">,</span></div><div class='line' id='LC57'>			<span class="s2">&quot;numlock&quot;</span><span class="o">:</span> <span class="mi">144</span><span class="p">,</span> <span class="s2">&quot;num&quot;</span><span class="o">:</span> <span class="mi">144</span><span class="p">,</span></div><div class='line' id='LC58'>			<span class="s2">&quot;scrolllock&quot;</span><span class="o">:</span> <span class="mi">145</span><span class="p">,</span> <span class="s2">&quot;scroll&quot;</span><span class="o">:</span> <span class="mi">145</span><span class="p">,</span></div><div class='line' id='LC59'>			<span class="s2">&quot;semicolon&quot;</span><span class="o">:</span> <span class="mi">186</span><span class="p">,</span></div><div class='line' id='LC60'>			<span class="s2">&quot;equal&quot;</span><span class="o">:</span> <span class="mi">187</span><span class="p">,</span> <span class="s2">&quot;equalsign&quot;</span><span class="o">:</span> <span class="mi">187</span><span class="p">,</span></div><div class='line' id='LC61'>			<span class="s2">&quot;comma&quot;</span><span class="o">:</span> <span class="mi">188</span><span class="p">,</span></div><div class='line' id='LC62'>			<span class="s2">&quot;dash&quot;</span><span class="o">:</span> <span class="mi">189</span><span class="p">,</span></div><div class='line' id='LC63'>			<span class="s2">&quot;period&quot;</span><span class="o">:</span> <span class="mi">190</span><span class="p">,</span></div><div class='line' id='LC64'>			<span class="s2">&quot;slash&quot;</span><span class="o">:</span> <span class="mi">191</span><span class="p">,</span> <span class="s2">&quot;forwardslash&quot;</span><span class="o">:</span> <span class="mi">191</span><span class="p">,</span></div><div class='line' id='LC65'>			<span class="s2">&quot;graveaccent&quot;</span><span class="o">:</span> <span class="mi">192</span><span class="p">,</span></div><div class='line' id='LC66'>			<span class="s2">&quot;openbracket&quot;</span><span class="o">:</span> <span class="mi">219</span><span class="p">,</span></div><div class='line' id='LC67'>			<span class="s2">&quot;backslash&quot;</span><span class="o">:</span> <span class="mi">220</span><span class="p">,</span></div><div class='line' id='LC68'>			<span class="s2">&quot;closebracket&quot;</span><span class="o">:</span> <span class="mi">221</span><span class="p">,</span></div><div class='line' id='LC69'>			<span class="s2">&quot;singlequote&quot;</span><span class="o">:</span> <span class="mi">222</span></div><div class='line' id='LC70'>		<span class="p">}</span></div><div class='line' id='LC71'><br/></div><div class='line' id='LC72'>		<span class="c1">//If you create a new local please submit it as a pull request or post it in the issue tracker at</span></div><div class='line' id='LC73'>		<span class="c1">// http://github.com/RobertWhurst/KeyboardJS/issues/</span></div><div class='line' id='LC74'>	<span class="p">}</span></div><div class='line' id='LC75'><br/></div><div class='line' id='LC76'>	<span class="c1">//keys</span></div><div class='line' id='LC77'>	<span class="kd">var</span> <span class="nx">keys</span> <span class="o">=</span> <span class="nx">locals</span><span class="p">[</span><span class="s1">&#39;us&#39;</span><span class="p">],</span></div><div class='line' id='LC78'>		<span class="nx">activeKeys</span> <span class="o">=</span> <span class="p">[],</span></div><div class='line' id='LC79'>		<span class="nx">activeBindings</span> <span class="o">=</span> <span class="p">{},</span></div><div class='line' id='LC80'>		<span class="nx">keyBindingGroups</span> <span class="o">=</span> <span class="p">[];</span></div><div class='line' id='LC81'><br/></div><div class='line' id='LC82'>	<span class="c1">//adds keys to the active keys array</span></div><div class='line' id='LC83'>	<span class="nx">bind</span><span class="p">(</span><span class="nb">document</span><span class="p">,</span> <span class="s2">&quot;keydown&quot;</span><span class="p">,</span> <span class="kd">function</span><span class="p">(</span><span class="nx">event</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC84'><br/></div><div class='line' id='LC85'>		<span class="c1">//lookup the key pressed and save it to the active keys array</span></div><div class='line' id='LC86'>		<span class="k">for</span> <span class="p">(</span><span class="kd">var</span> <span class="nx">key</span> <span class="k">in</span> <span class="nx">keys</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC87'>			<span class="k">if</span><span class="p">(</span><span class="nx">keys</span><span class="p">.</span><span class="nx">hasOwnProperty</span><span class="p">(</span><span class="nx">key</span><span class="p">)</span> <span class="o">&amp;&amp;</span> <span class="nx">event</span><span class="p">.</span><span class="nx">keyCode</span> <span class="o">===</span> <span class="nx">keys</span><span class="p">[</span><span class="nx">key</span><span class="p">])</span> <span class="p">{</span></div><div class='line' id='LC88'>				<span class="k">if</span><span class="p">(</span><span class="nx">activeKeys</span><span class="p">.</span><span class="nx">indexOf</span><span class="p">(</span><span class="nx">key</span><span class="p">)</span> <span class="o">&lt;</span> <span class="mi">0</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC89'>					<span class="nx">activeKeys</span><span class="p">.</span><span class="nx">push</span><span class="p">(</span><span class="nx">key</span><span class="p">);</span></div><div class='line' id='LC90'>				<span class="p">}</span></div><div class='line' id='LC91'>			<span class="p">}</span></div><div class='line' id='LC92'>		<span class="p">}</span></div><div class='line' id='LC93'><br/></div><div class='line' id='LC94'>		<span class="c1">//execute the first callback the longest key binding that matches the active keys</span></div><div class='line' id='LC95'>		<span class="k">return</span> <span class="nx">executeActiveKeyBindings</span><span class="p">(</span><span class="nx">event</span><span class="p">);</span></div><div class='line' id='LC96'><br/></div><div class='line' id='LC97'>	<span class="p">});</span></div><div class='line' id='LC98'><br/></div><div class='line' id='LC99'>	<span class="c1">//removes keys from the active array</span></div><div class='line' id='LC100'>	<span class="nx">bind</span><span class="p">(</span><span class="nb">document</span><span class="p">,</span> <span class="s2">&quot;keyup&quot;</span><span class="p">,</span> <span class="kd">function</span> <span class="p">(</span><span class="nx">event</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC101'><br/></div><div class='line' id='LC102'>		<span class="c1">//lookup the key released and prune it from the active keys array</span></div><div class='line' id='LC103'>		<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">key</span> <span class="k">in</span> <span class="nx">keys</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC104'>			<span class="k">if</span><span class="p">(</span><span class="nx">keys</span><span class="p">.</span><span class="nx">hasOwnProperty</span><span class="p">(</span><span class="nx">key</span><span class="p">)</span> <span class="o">&amp;&amp;</span> <span class="nx">event</span><span class="p">.</span><span class="nx">keyCode</span> <span class="o">===</span> <span class="nx">keys</span><span class="p">[</span><span class="nx">key</span><span class="p">])</span> <span class="p">{</span></div><div class='line' id='LC105'><br/></div><div class='line' id='LC106'>				<span class="kd">var</span> <span class="nx">iAK</span> <span class="o">=</span> <span class="nx">activeKeys</span><span class="p">.</span><span class="nx">indexOf</span><span class="p">(</span><span class="nx">key</span><span class="p">);</span></div><div class='line' id='LC107'><br/></div><div class='line' id='LC108'>				<span class="k">if</span><span class="p">(</span><span class="nx">iAK</span> <span class="o">&gt;</span> <span class="o">-</span><span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC109'>					<span class="nx">activeKeys</span><span class="p">.</span><span class="nx">splice</span><span class="p">(</span><span class="nx">iAK</span><span class="p">,</span> <span class="mi">1</span><span class="p">);</span></div><div class='line' id='LC110'>				<span class="p">}</span></div><div class='line' id='LC111'>			<span class="p">}</span></div><div class='line' id='LC112'>		<span class="p">}</span></div><div class='line' id='LC113'><br/></div><div class='line' id='LC114'>		<span class="c1">//execute the end callback on the active key binding</span></div><div class='line' id='LC115'>		<span class="k">return</span> <span class="nx">pruneActiveKeyBindings</span><span class="p">(</span><span class="nx">event</span><span class="p">);</span></div><div class='line' id='LC116'><br/></div><div class='line' id='LC117'>	<span class="p">});</span></div><div class='line' id='LC118'><br/></div><div class='line' id='LC119'>	<span class="c1">//bind to the window blur event and clear all pressed keys</span></div><div class='line' id='LC120'>	<span class="nx">bind</span><span class="p">(</span><span class="nb">window</span><span class="p">,</span> <span class="s2">&quot;blur&quot;</span><span class="p">,</span> <span class="kd">function</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC121'>		<span class="nx">activeKeys</span> <span class="o">=</span> <span class="p">[];</span></div><div class='line' id='LC122'><br/></div><div class='line' id='LC123'>		<span class="c1">//execute the end callback on the active key binding</span></div><div class='line' id='LC124'>		<span class="k">return</span> <span class="nx">pruneActiveKeyBindings</span><span class="p">(</span><span class="nx">event</span><span class="p">);</span></div><div class='line' id='LC125'>	<span class="p">});</span></div><div class='line' id='LC126'><br/></div><div class='line' id='LC127'>	<span class="cm">/**</span></div><div class='line' id='LC128'><span class="cm">	 * Generates an array of active key bindings</span></div><div class='line' id='LC129'><span class="cm">	 */</span></div><div class='line' id='LC130'>	<span class="kd">function</span> <span class="nx">queryActiveBindings</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC131'>		<span class="kd">var</span> <span class="nx">bindingStack</span> <span class="o">=</span> <span class="p">[];</span></div><div class='line' id='LC132'><br/></div><div class='line' id='LC133'>		<span class="c1">//loop through the key binding groups by number of keys.</span></div><div class='line' id='LC134'>		<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">keyCount</span> <span class="o">=</span> <span class="nx">keyBindingGroups</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">keyCount</span> <span class="o">&gt;</span> <span class="o">-</span><span class="mi">1</span><span class="p">;</span> <span class="nx">keyCount</span> <span class="o">-=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC135'>			<span class="k">if</span><span class="p">(</span><span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">keyCount</span><span class="p">])</span> <span class="p">{</span></div><div class='line' id='LC136'>				<span class="kd">var</span> <span class="nx">KeyBindingGroup</span> <span class="o">=</span> <span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">keyCount</span><span class="p">];</span></div><div class='line' id='LC137'><br/></div><div class='line' id='LC138'>				<span class="c1">//loop through the key bindings of the same key length.</span></div><div class='line' id='LC139'>				<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">bindingIndex</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">bindingIndex</span> <span class="o">&lt;</span> <span class="nx">KeyBindingGroup</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">bindingIndex</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC140'>					<span class="kd">var</span> <span class="nx">binding</span> <span class="o">=</span> <span class="nx">KeyBindingGroup</span><span class="p">[</span><span class="nx">bindingIndex</span><span class="p">],</span></div><div class='line' id='LC141'><br/></div><div class='line' id='LC142'>					<span class="c1">//assume the binding is active till a required key is found to be unsatisfied</span></div><div class='line' id='LC143'>						<span class="nx">keyBindingActive</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC144'><br/></div><div class='line' id='LC145'>					<span class="c1">//loop through each key required by the binding.</span></div><div class='line' id='LC146'>					<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">keyIndex</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">keyIndex</span> <span class="o">&lt;</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span>  <span class="nx">keyIndex</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC147'>						<span class="kd">var</span> <span class="nx">key</span> <span class="o">=</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keys</span><span class="p">[</span><span class="nx">keyIndex</span><span class="p">];</span></div><div class='line' id='LC148'><br/></div><div class='line' id='LC149'>						<span class="c1">//if the current key is not in the active keys array the mark the binding as inactive</span></div><div class='line' id='LC150'>						<span class="k">if</span><span class="p">(</span><span class="nx">activeKeys</span><span class="p">.</span><span class="nx">indexOf</span><span class="p">(</span><span class="nx">key</span><span class="p">)</span> <span class="o">&lt;</span> <span class="mi">0</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC151'>							<span class="nx">keyBindingActive</span> <span class="o">=</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC152'>						<span class="p">}</span></div><div class='line' id='LC153'>					<span class="p">}</span></div><div class='line' id='LC154'><br/></div><div class='line' id='LC155'>					<span class="c1">//if the key combo is still active then push it into the binding stack</span></div><div class='line' id='LC156'>					<span class="k">if</span><span class="p">(</span><span class="nx">keyBindingActive</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC157'>						<span class="nx">bindingStack</span><span class="p">.</span><span class="nx">push</span><span class="p">(</span><span class="nx">binding</span><span class="p">);</span></div><div class='line' id='LC158'>					<span class="p">}</span></div><div class='line' id='LC159'>				<span class="p">}</span></div><div class='line' id='LC160'>			<span class="p">}</span></div><div class='line' id='LC161'>		<span class="p">}</span></div><div class='line' id='LC162'><br/></div><div class='line' id='LC163'>		<span class="k">return</span> <span class="nx">bindingStack</span><span class="p">;</span></div><div class='line' id='LC164'>	<span class="p">}</span></div><div class='line' id='LC165'><br/></div><div class='line' id='LC166'>	<span class="cm">/**</span></div><div class='line' id='LC167'><span class="cm">	 * Collects active keys, sets active binds and fires on key down callbacks</span></div><div class='line' id='LC168'><span class="cm">	 * @param event</span></div><div class='line' id='LC169'><span class="cm">	 */</span></div><div class='line' id='LC170'>	<span class="kd">function</span> <span class="nx">executeActiveKeyBindings</span><span class="p">(</span><span class="nx">event</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC171'><br/></div><div class='line' id='LC172'>		<span class="k">if</span><span class="p">(</span><span class="nx">activeKeys</span> <span class="o">&lt;</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC173'>			<span class="k">return</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC174'>		<span class="p">}</span></div><div class='line' id='LC175'><br/></div><div class='line' id='LC176'>		<span class="kd">var</span> <span class="nx">bindingStack</span> <span class="o">=</span> <span class="nx">queryActiveBindings</span><span class="p">(),</span></div><div class='line' id='LC177'>			<span class="nx">spentKeys</span> <span class="o">=</span> <span class="p">[],</span></div><div class='line' id='LC178'>			<span class="nx">output</span><span class="p">;</span></div><div class='line' id='LC179'><br/></div><div class='line' id='LC180'>		<span class="c1">//loop through each active binding</span></div><div class='line' id='LC181'>		<span class="k">for</span> <span class="p">(</span><span class="kd">var</span> <span class="nx">bindingIndex</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">bindingIndex</span> <span class="o">&lt;</span> <span class="nx">bindingStack</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">bindingIndex</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC182'>			<span class="kd">var</span> <span class="nx">binding</span> <span class="o">=</span> <span class="nx">bindingStack</span><span class="p">[</span><span class="nx">bindingIndex</span><span class="p">],</span></div><div class='line' id='LC183'>				<span class="nx">usesSpentKey</span> <span class="o">=</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC184'><br/></div><div class='line' id='LC185'>			<span class="c1">//check each of the required keys. Make sure they have not been used by another binding</span></div><div class='line' id='LC186'>			<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">keyIndex</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">keyIndex</span> <span class="o">&lt;</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">keyIndex</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC187'>				<span class="kd">var</span> <span class="nx">key</span> <span class="o">=</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keys</span><span class="p">[</span><span class="nx">keyIndex</span><span class="p">];</span></div><div class='line' id='LC188'>				<span class="k">if</span><span class="p">(</span><span class="nx">spentKeys</span><span class="p">.</span><span class="nx">indexOf</span><span class="p">(</span><span class="nx">key</span><span class="p">)</span> <span class="o">&gt;</span> <span class="o">-</span><span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC189'>					<span class="nx">usesSpentKey</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC190'>					<span class="k">break</span><span class="p">;</span></div><div class='line' id='LC191'>				<span class="p">}</span></div><div class='line' id='LC192'>			<span class="p">}</span></div><div class='line' id='LC193'><br/></div><div class='line' id='LC194'>			<span class="c1">//if the binding does not use a key that has been spent then execute it</span></div><div class='line' id='LC195'>			<span class="k">if</span><span class="p">(</span><span class="o">!</span><span class="nx">usesSpentKey</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC196'><br/></div><div class='line' id='LC197'>				<span class="c1">//fire the callback</span></div><div class='line' id='LC198'>				<span class="k">if</span><span class="p">(</span><span class="k">typeof</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">callback</span> <span class="o">===</span> <span class="s2">&quot;function&quot;</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC199'>					<span class="k">if</span><span class="p">(</span><span class="o">!</span><span class="nx">binding</span><span class="p">.</span><span class="nx">callback</span><span class="p">(</span><span class="nx">event</span><span class="p">,</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keys</span><span class="p">,</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keyCombo</span><span class="p">))</span> <span class="p">{</span></div><div class='line' id='LC200'>						<span class="nx">output</span> <span class="o">=</span> <span class="kc">false</span></div><div class='line' id='LC201'>					<span class="p">}</span></div><div class='line' id='LC202'>				<span class="p">}</span></div><div class='line' id='LC203'><br/></div><div class='line' id='LC204'>				<span class="c1">//add the binding&#39;s combo to the active bindings array</span></div><div class='line' id='LC205'>				<span class="k">if</span><span class="p">(</span><span class="o">!</span><span class="nx">activeBindings</span><span class="p">[</span><span class="nx">binding</span><span class="p">.</span><span class="nx">keyCombo</span><span class="p">])</span> <span class="p">{</span></div><div class='line' id='LC206'>					<span class="nx">activeBindings</span><span class="p">[</span><span class="nx">binding</span><span class="p">.</span><span class="nx">keyCombo</span><span class="p">]</span> <span class="o">=</span> <span class="nx">binding</span><span class="p">;</span></div><div class='line' id='LC207'>				<span class="p">}</span></div><div class='line' id='LC208'><br/></div><div class='line' id='LC209'>				<span class="c1">//add the current key binding&#39;s keys to the spent keys array</span></div><div class='line' id='LC210'>				<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">keyIndex</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">keyIndex</span> <span class="o">&lt;</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">keyIndex</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC211'>					<span class="kd">var</span> <span class="nx">key</span> <span class="o">=</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keys</span><span class="p">[</span><span class="nx">keyIndex</span><span class="p">];</span></div><div class='line' id='LC212'>					<span class="k">if</span><span class="p">(</span><span class="nx">spentKeys</span><span class="p">.</span><span class="nx">indexOf</span><span class="p">(</span><span class="nx">key</span><span class="p">)</span> <span class="o">&lt;</span> <span class="mi">0</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC213'>						<span class="nx">spentKeys</span><span class="p">.</span><span class="nx">push</span><span class="p">(</span><span class="nx">key</span><span class="p">);</span></div><div class='line' id='LC214'>					<span class="p">}</span></div><div class='line' id='LC215'>				<span class="p">}</span></div><div class='line' id='LC216'>			<span class="p">}</span></div><div class='line' id='LC217'>		<span class="p">}</span></div><div class='line' id='LC218'><br/></div><div class='line' id='LC219'>		<span class="c1">//if there are spent keys then we know a binding was fired</span></div><div class='line' id='LC220'>		<span class="c1">// and that we need to tell jQuery to prevent event bubbling.</span></div><div class='line' id='LC221'>		<span class="k">if</span><span class="p">(</span><span class="nx">spentKeys</span><span class="p">.</span><span class="nx">length</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC222'>			<span class="k">return</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC223'>		<span class="p">}</span></div><div class='line' id='LC224'><br/></div><div class='line' id='LC225'>		<span class="k">return</span> <span class="nx">output</span><span class="p">;</span></div><div class='line' id='LC226'>	<span class="p">}</span></div><div class='line' id='LC227'><br/></div><div class='line' id='LC228'>	<span class="cm">/**</span></div><div class='line' id='LC229'><span class="cm">	 * Removes no longer active keys and fires the on key up callbacks for associated active bindings.</span></div><div class='line' id='LC230'><span class="cm">	 * @param event</span></div><div class='line' id='LC231'><span class="cm">	 */</span></div><div class='line' id='LC232'>	<span class="kd">function</span> <span class="nx">pruneActiveKeyBindings</span><span class="p">(</span><span class="nx">event</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC233'>		<span class="kd">var</span> <span class="nx">bindingStack</span> <span class="o">=</span> <span class="nx">queryActiveBindings</span><span class="p">();</span></div><div class='line' id='LC234'>		<span class="kd">var</span> <span class="nx">output</span><span class="p">;</span></div><div class='line' id='LC235'><br/></div><div class='line' id='LC236'>		<span class="c1">//loop through the active combos</span></div><div class='line' id='LC237'>		<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">bindingCombo</span> <span class="k">in</span> <span class="nx">activeBindings</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC238'>			<span class="k">if</span><span class="p">(</span><span class="nx">activeBindings</span><span class="p">.</span><span class="nx">hasOwnProperty</span><span class="p">(</span><span class="nx">bindingCombo</span><span class="p">))</span> <span class="p">{</span></div><div class='line' id='LC239'>				<span class="kd">var</span> <span class="nx">binding</span> <span class="o">=</span> <span class="nx">activeBindings</span><span class="p">[</span><span class="nx">bindingCombo</span><span class="p">],</span></div><div class='line' id='LC240'>					<span class="nx">active</span> <span class="o">=</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC241'><br/></div><div class='line' id='LC242'>				<span class="c1">//loop thorugh the active bindings</span></div><div class='line' id='LC243'>				<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">bindingIndex</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">bindingIndex</span> <span class="o">&lt;</span> <span class="nx">bindingStack</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">bindingIndex</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC244'>					<span class="kd">var</span> <span class="nx">activeCombo</span> <span class="o">=</span> <span class="nx">bindingStack</span><span class="p">[</span><span class="nx">bindingIndex</span><span class="p">].</span><span class="nx">keyCombo</span><span class="p">;</span></div><div class='line' id='LC245'><br/></div><div class='line' id='LC246'>					<span class="c1">//check to see if the combo is still active</span></div><div class='line' id='LC247'>					<span class="k">if</span><span class="p">(</span><span class="nx">activeCombo</span> <span class="o">===</span> <span class="nx">bindingCombo</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC248'>						<span class="nx">active</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC249'>						<span class="k">break</span><span class="p">;</span></div><div class='line' id='LC250'>					<span class="p">}</span></div><div class='line' id='LC251'>				<span class="p">}</span></div><div class='line' id='LC252'><br/></div><div class='line' id='LC253'>				<span class="c1">//if the combo is no longer active then fire its end callback and remove it</span></div><div class='line' id='LC254'>				<span class="k">if</span><span class="p">(</span><span class="o">!</span><span class="nx">active</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC255'><br/></div><div class='line' id='LC256'>					<span class="k">if</span><span class="p">(</span><span class="k">typeof</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">endCallback</span> <span class="o">===</span> <span class="s2">&quot;function&quot;</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC257'>						<span class="k">if</span><span class="p">(</span><span class="o">!</span><span class="nx">binding</span><span class="p">.</span><span class="nx">endCallback</span><span class="p">(</span><span class="nx">event</span><span class="p">,</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keys</span><span class="p">,</span> <span class="nx">binding</span><span class="p">.</span><span class="nx">keyCombo</span><span class="p">))</span> <span class="p">{</span></div><div class='line' id='LC258'>							<span class="nx">output</span> <span class="o">=</span> <span class="kc">false</span></div><div class='line' id='LC259'>						<span class="p">}</span></div><div class='line' id='LC260'>					<span class="p">}</span></div><div class='line' id='LC261'><br/></div><div class='line' id='LC262'>					<span class="k">delete</span> <span class="nx">activeBindings</span><span class="p">[</span><span class="nx">bindingCombo</span><span class="p">];</span></div><div class='line' id='LC263'>				<span class="p">}</span></div><div class='line' id='LC264'>			<span class="p">}</span></div><div class='line' id='LC265'>		<span class="p">}</span></div><div class='line' id='LC266'><br/></div><div class='line' id='LC267'>		<span class="k">return</span> <span class="nx">output</span><span class="p">;</span></div><div class='line' id='LC268'>	<span class="p">}</span></div><div class='line' id='LC269'><br/></div><div class='line' id='LC270'>	<span class="cm">/**</span></div><div class='line' id='LC271'><span class="cm">	 * Binds a on key down and on key up callback to a key or key combo. Accepts a string containing the name of each</span></div><div class='line' id='LC272'><span class="cm">	 * key you want to bind to comma separated. If you want to bind a combo the use the plus sign to link keys together.</span></div><div class='line' id='LC273'><span class="cm">	 * Example: &#39;ctrl + x, ctrl + c&#39; Will fire if Control and x or y are pressed at the same time.</span></div><div class='line' id='LC274'><span class="cm">	 * @param keyCombo</span></div><div class='line' id='LC275'><span class="cm">	 * @param callback</span></div><div class='line' id='LC276'><span class="cm">	 * @param endCallback</span></div><div class='line' id='LC277'><span class="cm">	 */</span></div><div class='line' id='LC278'>	<span class="kd">function</span> <span class="nx">bindKey</span><span class="p">(</span><span class="nx">keyCombo</span><span class="p">,</span> <span class="nx">callback</span><span class="p">,</span> <span class="nx">endCallback</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC279'><br/></div><div class='line' id='LC280'>		<span class="kd">function</span> <span class="nx">clear</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC281'>			<span class="k">if</span><span class="p">(</span><span class="nx">keys</span> <span class="o">&amp;&amp;</span> <span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC282'>				<span class="kd">var</span> <span class="nx">keyBindingGroup</span> <span class="o">=</span> <span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">];</span></div><div class='line' id='LC283'><br/></div><div class='line' id='LC284'>				<span class="k">if</span><span class="p">(</span><span class="nx">keyBindingGroup</span><span class="p">.</span><span class="nx">indexOf</span><span class="p">(</span><span class="nx">keyBinding</span><span class="p">)</span> <span class="o">&gt;</span> <span class="o">-</span><span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC285'>					<span class="kd">var</span> <span class="nx">index</span> <span class="o">=</span> <span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">].</span><span class="nx">indexOf</span><span class="p">(</span><span class="nx">keyBinding</span><span class="p">);</span></div><div class='line' id='LC286'>					<span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">].</span><span class="nx">splice</span><span class="p">(</span><span class="nx">index</span><span class="p">,</span> <span class="mi">1</span><span class="p">);</span></div><div class='line' id='LC287'>				<span class="p">}</span></div><div class='line' id='LC288'>			<span class="p">}</span></div><div class='line' id='LC289'>		<span class="p">}</span></div><div class='line' id='LC290'><br/></div><div class='line' id='LC291'>		<span class="c1">//create an array of combos from the first argument</span></div><div class='line' id='LC292'>		<span class="kd">var</span> <span class="nx">bindSets</span> <span class="o">=</span> <span class="nx">keyCombo</span><span class="p">.</span><span class="nx">toLowerCase</span><span class="p">().</span><span class="nx">replace</span><span class="p">(</span><span class="sr">/\s/g</span><span class="p">,</span> <span class="s1">&#39;&#39;</span><span class="p">).</span><span class="nx">split</span><span class="p">(</span><span class="s1">&#39;,&#39;</span><span class="p">);</span></div><div class='line' id='LC293'><br/></div><div class='line' id='LC294'>		<span class="c1">//create a binding for each key combo</span></div><div class='line' id='LC295'>		<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">i</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">i</span> <span class="o">&lt;</span> <span class="nx">bindSets</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">i</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC296'><br/></div><div class='line' id='LC297'>			<span class="c1">//split up the keys</span></div><div class='line' id='LC298'>			<span class="kd">var</span> <span class="nx">keys</span> <span class="o">=</span> <span class="nx">bindSets</span><span class="p">[</span><span class="nx">i</span><span class="p">].</span><span class="nx">split</span><span class="p">(</span><span class="s1">&#39;+&#39;</span><span class="p">);</span></div><div class='line' id='LC299'><br/></div><div class='line' id='LC300'>			<span class="c1">//if there are keys in the current combo</span></div><div class='line' id='LC301'>			<span class="k">if</span><span class="p">(</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC302'>				<span class="k">if</span><span class="p">(</span><span class="o">!</span><span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">])</span> <span class="p">{</span> <span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">]</span> <span class="o">=</span> <span class="p">[];</span> <span class="p">}</span></div><div class='line' id='LC303'><br/></div><div class='line' id='LC304'>				<span class="c1">//define the</span></div><div class='line' id='LC305'>				<span class="kd">var</span> <span class="nx">keyBinding</span> <span class="o">=</span> <span class="p">{</span></div><div class='line' id='LC306'>					<span class="s2">&quot;callback&quot;</span><span class="o">:</span> <span class="nx">callback</span><span class="p">,</span></div><div class='line' id='LC307'>					<span class="s2">&quot;endCallback&quot;</span><span class="o">:</span> <span class="nx">endCallback</span><span class="p">,</span></div><div class='line' id='LC308'>					<span class="s2">&quot;keyCombo&quot;</span><span class="o">:</span> <span class="nx">bindSets</span><span class="p">[</span><span class="nx">i</span><span class="p">],</span></div><div class='line' id='LC309'>					<span class="s2">&quot;keys&quot;</span><span class="o">:</span> <span class="nx">keys</span></div><div class='line' id='LC310'>				<span class="p">};</span></div><div class='line' id='LC311'><br/></div><div class='line' id='LC312'>				<span class="c1">//save the binding sorted by length</span></div><div class='line' id='LC313'>				<span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">].</span><span class="nx">push</span><span class="p">(</span><span class="nx">keyBinding</span><span class="p">);</span></div><div class='line' id='LC314'>			<span class="p">}</span></div><div class='line' id='LC315'>		<span class="p">}</span></div><div class='line' id='LC316'><br/></div><div class='line' id='LC317'>		<span class="k">return</span> <span class="p">{</span></div><div class='line' id='LC318'>			<span class="s2">&quot;clear&quot;</span><span class="o">:</span> <span class="nx">clear</span></div><div class='line' id='LC319'>		<span class="p">}</span></div><div class='line' id='LC320'>	<span class="p">}</span></div><div class='line' id='LC321'><br/></div><div class='line' id='LC322'>	<span class="cm">/**</span></div><div class='line' id='LC323'><span class="cm">	 * Binds keys or key combos to an axis. The keys should be in the following order; up, down, left, right. If any</span></div><div class='line' id='LC324'><span class="cm">	 * of the the binded key or key combos are active the callback will fire. The callback will be passed an array</span></div><div class='line' id='LC325'><span class="cm">	 * containing two numbers. The first represents x and the second represents y. Both have a possible range of -1,</span></div><div class='line' id='LC326'><span class="cm">	 * 0, or 1 depending on the axis direction.</span></div><div class='line' id='LC327'><span class="cm">	 * @param up</span></div><div class='line' id='LC328'><span class="cm">	 * @param down</span></div><div class='line' id='LC329'><span class="cm">	 * @param left</span></div><div class='line' id='LC330'><span class="cm">	 * @param right</span></div><div class='line' id='LC331'><span class="cm">	 * @param callback</span></div><div class='line' id='LC332'><span class="cm">	 */</span></div><div class='line' id='LC333'>	<span class="kd">function</span> <span class="nx">bindAxis</span><span class="p">(</span><span class="nx">up</span><span class="p">,</span> <span class="nx">down</span><span class="p">,</span> <span class="nx">left</span><span class="p">,</span> <span class="nx">right</span><span class="p">,</span> <span class="nx">callback</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC334'><br/></div><div class='line' id='LC335'>		<span class="kd">function</span> <span class="nx">clear</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC336'>			<span class="k">if</span><span class="p">(</span><span class="k">typeof</span> <span class="nx">clearUp</span> <span class="o">===</span> <span class="s1">&#39;function&#39;</span><span class="p">)</span> <span class="p">{</span> <span class="nx">clearUp</span><span class="p">();</span> <span class="p">}</span></div><div class='line' id='LC337'>			<span class="k">if</span><span class="p">(</span><span class="k">typeof</span> <span class="nx">clearDown</span> <span class="o">===</span> <span class="s1">&#39;function&#39;</span><span class="p">)</span> <span class="p">{</span> <span class="nx">clearDown</span><span class="p">();</span> <span class="p">}</span></div><div class='line' id='LC338'>			<span class="k">if</span><span class="p">(</span><span class="k">typeof</span> <span class="nx">clearLeft</span> <span class="o">===</span> <span class="s1">&#39;function&#39;</span><span class="p">)</span> <span class="p">{</span> <span class="nx">clearLeft</span><span class="p">();</span> <span class="p">}</span></div><div class='line' id='LC339'>			<span class="k">if</span><span class="p">(</span><span class="k">typeof</span> <span class="nx">clearRight</span> <span class="o">===</span> <span class="s1">&#39;function&#39;</span><span class="p">)</span> <span class="p">{</span> <span class="nx">clearRight</span><span class="p">();</span> <span class="p">}</span></div><div class='line' id='LC340'>			<span class="k">if</span><span class="p">(</span><span class="k">typeof</span> <span class="nx">timer</span> <span class="o">===</span> <span class="s1">&#39;function&#39;</span><span class="p">)</span> <span class="p">{</span> <span class="nx">clearInterval</span><span class="p">(</span><span class="nx">timer</span><span class="p">);</span> <span class="p">}</span></div><div class='line' id='LC341'>		<span class="p">}</span></div><div class='line' id='LC342'><br/></div><div class='line' id='LC343'>		<span class="kd">var</span> <span class="nx">axis</span> <span class="o">=</span> <span class="p">[</span><span class="mi">0</span><span class="p">,</span> <span class="mi">0</span><span class="p">];</span></div><div class='line' id='LC344'><br/></div><div class='line' id='LC345'>		<span class="k">if</span><span class="p">(</span><span class="k">typeof</span> <span class="nx">callback</span> <span class="o">!==</span> <span class="s1">&#39;function&#39;</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC346'>			<span class="k">return</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC347'>		<span class="p">}</span></div><div class='line' id='LC348'><br/></div><div class='line' id='LC349'>		<span class="c1">//up</span></div><div class='line' id='LC350'>		<span class="kd">var</span> <span class="nx">clearUp</span> <span class="o">=</span> <span class="nx">bindKey</span><span class="p">(</span><span class="nx">up</span><span class="p">,</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC351'>			<span class="k">if</span><span class="p">(</span><span class="nx">axis</span><span class="p">[</span><span class="mi">0</span><span class="p">]</span> <span class="o">===</span> <span class="mi">0</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC352'>				<span class="nx">axis</span><span class="p">[</span><span class="mi">0</span><span class="p">]</span> <span class="o">=</span> <span class="o">-</span><span class="mi">1</span><span class="p">;</span></div><div class='line' id='LC353'>			<span class="p">}</span></div><div class='line' id='LC354'>		<span class="p">},</span> <span class="kd">function</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC355'>			<span class="nx">axis</span><span class="p">[</span><span class="mi">0</span><span class="p">]</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span></div><div class='line' id='LC356'>		<span class="p">}).</span><span class="nx">clear</span><span class="p">;</span></div><div class='line' id='LC357'><br/></div><div class='line' id='LC358'>		<span class="c1">//down</span></div><div class='line' id='LC359'>		<span class="kd">var</span> <span class="nx">clearDown</span> <span class="o">=</span> <span class="nx">bindKey</span><span class="p">(</span><span class="nx">down</span><span class="p">,</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC360'>			<span class="k">if</span><span class="p">(</span><span class="nx">axis</span><span class="p">[</span><span class="mi">0</span><span class="p">]</span> <span class="o">===</span> <span class="mi">0</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC361'>				<span class="nx">axis</span><span class="p">[</span><span class="mi">0</span><span class="p">]</span> <span class="o">=</span> <span class="mi">1</span><span class="p">;</span></div><div class='line' id='LC362'>			<span class="p">}</span></div><div class='line' id='LC363'>		<span class="p">},</span> <span class="kd">function</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC364'>			<span class="nx">axis</span><span class="p">[</span><span class="mi">0</span><span class="p">]</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span></div><div class='line' id='LC365'>		<span class="p">}).</span><span class="nx">clear</span><span class="p">;</span></div><div class='line' id='LC366'><br/></div><div class='line' id='LC367'>		<span class="c1">//left</span></div><div class='line' id='LC368'>		<span class="kd">var</span> <span class="nx">clearLeft</span> <span class="o">=</span> <span class="nx">bindKey</span><span class="p">(</span><span class="nx">left</span><span class="p">,</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC369'>			<span class="k">if</span><span class="p">(</span><span class="nx">axis</span><span class="p">[</span><span class="mi">1</span><span class="p">]</span> <span class="o">===</span> <span class="mi">0</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC370'>				<span class="nx">axis</span><span class="p">[</span><span class="mi">1</span><span class="p">]</span> <span class="o">=</span> <span class="o">-</span><span class="mi">1</span><span class="p">;</span></div><div class='line' id='LC371'>			<span class="p">}</span></div><div class='line' id='LC372'>		<span class="p">},</span> <span class="kd">function</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC373'>			<span class="nx">axis</span><span class="p">[</span><span class="mi">1</span><span class="p">]</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span></div><div class='line' id='LC374'>		<span class="p">}).</span><span class="nx">clear</span><span class="p">;</span></div><div class='line' id='LC375'><br/></div><div class='line' id='LC376'>		<span class="c1">//right</span></div><div class='line' id='LC377'>		<span class="kd">var</span> <span class="nx">clearRight</span> <span class="o">=</span> <span class="nx">bindKey</span><span class="p">(</span><span class="nx">right</span><span class="p">,</span> <span class="kd">function</span> <span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC378'>			<span class="k">if</span><span class="p">(</span><span class="nx">axis</span><span class="p">[</span><span class="mi">1</span><span class="p">]</span> <span class="o">===</span> <span class="mi">0</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC379'>				<span class="nx">axis</span><span class="p">[</span><span class="mi">1</span><span class="p">]</span> <span class="o">=</span> <span class="mi">1</span><span class="p">;</span></div><div class='line' id='LC380'>			<span class="p">}</span></div><div class='line' id='LC381'>		<span class="p">},</span> <span class="kd">function</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC382'>			<span class="nx">axis</span><span class="p">[</span><span class="mi">1</span><span class="p">]</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span></div><div class='line' id='LC383'>		<span class="p">}).</span><span class="nx">clear</span><span class="p">;</span></div><div class='line' id='LC384'><br/></div><div class='line' id='LC385'>		<span class="kd">var</span> <span class="nx">timer</span> <span class="o">=</span> <span class="nx">setInterval</span><span class="p">(</span><span class="kd">function</span><span class="p">(){</span></div><div class='line' id='LC386'><br/></div><div class='line' id='LC387'>			<span class="c1">//NO CHANGE</span></div><div class='line' id='LC388'>			<span class="k">if</span><span class="p">(</span><span class="nx">axis</span><span class="p">[</span><span class="mi">0</span><span class="p">]</span> <span class="o">===</span> <span class="mi">0</span> <span class="o">&amp;&amp;</span> <span class="nx">axis</span><span class="p">[</span><span class="mi">1</span><span class="p">]</span> <span class="o">===</span> <span class="mi">0</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC389'>				<span class="k">return</span><span class="p">;</span></div><div class='line' id='LC390'>			<span class="p">}</span></div><div class='line' id='LC391'><br/></div><div class='line' id='LC392'>			<span class="c1">//run the callback</span></div><div class='line' id='LC393'>			<span class="nx">callback</span><span class="p">(</span><span class="nx">axis</span><span class="p">);</span></div><div class='line' id='LC394'><br/></div><div class='line' id='LC395'>		<span class="p">},</span> <span class="mi">1</span><span class="p">);</span></div><div class='line' id='LC396'><br/></div><div class='line' id='LC397'>		<span class="k">return</span> <span class="p">{</span></div><div class='line' id='LC398'>			<span class="s2">&quot;clear&quot;</span><span class="o">:</span> <span class="nx">clear</span></div><div class='line' id='LC399'>		<span class="p">}</span></div><div class='line' id='LC400'>	<span class="p">}</span></div><div class='line' id='LC401'><br/></div><div class='line' id='LC402'>	<span class="cm">/**</span></div><div class='line' id='LC403'><span class="cm">	 * Clears all key and key combo binds containing a given key or keys.</span></div><div class='line' id='LC404'><span class="cm">	 * @param keys</span></div><div class='line' id='LC405'><span class="cm">	 */</span></div><div class='line' id='LC406'>	<span class="kd">function</span> <span class="nx">unbindKey</span><span class="p">(</span><span class="nx">keys</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC407'><br/></div><div class='line' id='LC408'>		<span class="k">if</span><span class="p">(</span><span class="nx">keys</span> <span class="o">===</span> <span class="s1">&#39;all&#39;</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC409'>			<span class="nx">keyBindingGroups</span> <span class="o">=</span> <span class="p">[];</span></div><div class='line' id='LC410'>			<span class="k">return</span><span class="p">;</span></div><div class='line' id='LC411'>		<span class="p">}</span></div><div class='line' id='LC412'><br/></div><div class='line' id='LC413'>		<span class="nx">keys</span> <span class="o">=</span> <span class="nx">keys</span><span class="p">.</span><span class="nx">replace</span><span class="p">(</span><span class="sr">/\s/g</span><span class="p">,</span> <span class="s1">&#39;&#39;</span><span class="p">).</span><span class="nx">split</span><span class="p">(</span><span class="s1">&#39;,&#39;</span><span class="p">);</span></div><div class='line' id='LC414'><br/></div><div class='line' id='LC415'>		<span class="c1">//loop through the key binding groups.</span></div><div class='line' id='LC416'>		<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">iKCL</span> <span class="o">=</span> <span class="nx">keyBindingGroups</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">iKCL</span> <span class="o">&gt;</span> <span class="o">-</span><span class="mi">1</span><span class="p">;</span> <span class="nx">iKCL</span> <span class="o">-=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC417'>			<span class="k">if</span><span class="p">(</span><span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">iKCL</span><span class="p">])</span> <span class="p">{</span></div><div class='line' id='LC418'>				<span class="kd">var</span> <span class="nx">KeyBindingGroup</span> <span class="o">=</span> <span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">iKCL</span><span class="p">];</span></div><div class='line' id='LC419'><br/></div><div class='line' id='LC420'>				<span class="c1">//loop through the key bindings.</span></div><div class='line' id='LC421'>				<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">iB</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">iB</span> <span class="o">&lt;</span> <span class="nx">KeyBindingGroup</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">iB</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC422'>					<span class="kd">var</span> <span class="nx">keyBinding</span> <span class="o">=</span> <span class="nx">KeyBindingGroup</span><span class="p">[</span><span class="nx">iB</span><span class="p">],</span></div><div class='line' id='LC423'>						<span class="nx">remove</span> <span class="o">=</span> <span class="kc">false</span><span class="p">;</span></div><div class='line' id='LC424'><br/></div><div class='line' id='LC425'>					<span class="c1">//loop through the current key binding keys.</span></div><div class='line' id='LC426'>					<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">iKB</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">iKB</span> <span class="o">&lt;</span> <span class="nx">keyBinding</span><span class="p">.</span><span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span>  <span class="nx">iKB</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC427'>						<span class="kd">var</span> <span class="nx">key</span> <span class="o">=</span> <span class="nx">keyBinding</span><span class="p">.</span><span class="nx">keys</span><span class="p">[</span><span class="nx">iKB</span><span class="p">];</span></div><div class='line' id='LC428'><br/></div><div class='line' id='LC429'>						<span class="c1">//loop through the keys to be removed</span></div><div class='line' id='LC430'>						<span class="k">for</span><span class="p">(</span><span class="kd">var</span> <span class="nx">iKR</span> <span class="o">=</span> <span class="mi">0</span><span class="p">;</span> <span class="nx">iKR</span> <span class="o">&lt;</span> <span class="nx">keys</span><span class="p">.</span><span class="nx">length</span><span class="p">;</span> <span class="nx">iKR</span> <span class="o">+=</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC431'>							<span class="kd">var</span> <span class="nx">keyToRemove</span> <span class="o">=</span> <span class="nx">keys</span><span class="p">[</span><span class="nx">iKR</span><span class="p">];</span></div><div class='line' id='LC432'>							<span class="k">if</span><span class="p">(</span><span class="nx">keyToRemove</span> <span class="o">===</span> <span class="nx">key</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC433'>								<span class="nx">remove</span> <span class="o">=</span> <span class="kc">true</span><span class="p">;</span></div><div class='line' id='LC434'>								<span class="k">break</span><span class="p">;</span></div><div class='line' id='LC435'>							<span class="p">}</span></div><div class='line' id='LC436'>						<span class="p">}</span></div><div class='line' id='LC437'>						<span class="k">if</span><span class="p">(</span><span class="nx">remove</span><span class="p">)</span> <span class="p">{</span> <span class="k">break</span><span class="p">;</span> <span class="p">}</span></div><div class='line' id='LC438'>					<span class="p">}</span></div><div class='line' id='LC439'>					<span class="k">if</span><span class="p">(</span><span class="nx">remove</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC440'>						<span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">iKCL</span><span class="p">].</span><span class="nx">splice</span><span class="p">(</span><span class="nx">iB</span><span class="p">,</span> <span class="mi">1</span><span class="p">);</span> <span class="nx">iB</span> <span class="o">-=</span> <span class="mi">1</span><span class="p">;</span></div><div class='line' id='LC441'>						<span class="k">if</span><span class="p">(</span><span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">iKCL</span><span class="p">].</span><span class="nx">length</span> <span class="o">&lt;</span> <span class="mi">1</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC442'>							<span class="k">delete</span> <span class="nx">keyBindingGroups</span><span class="p">[</span><span class="nx">iKCL</span><span class="p">];</span></div><div class='line' id='LC443'>						<span class="p">}</span></div><div class='line' id='LC444'>					<span class="p">}</span></div><div class='line' id='LC445'>				<span class="p">}</span></div><div class='line' id='LC446'>			<span class="p">}</span></div><div class='line' id='LC447'>		<span class="p">}</span></div><div class='line' id='LC448'>	<span class="p">}</span></div><div class='line' id='LC449'><br/></div><div class='line' id='LC450'>	<span class="cm">/**</span></div><div class='line' id='LC451'><span class="cm">	 * Gets an array of active keys</span></div><div class='line' id='LC452'><span class="cm">	 */</span></div><div class='line' id='LC453'>	<span class="kd">function</span> <span class="nx">getActiveKeys</span><span class="p">()</span> <span class="p">{</span></div><div class='line' id='LC454'>		<span class="k">return</span> <span class="nx">activeKeys</span><span class="p">;</span></div><div class='line' id='LC455'>	<span class="p">}</span></div><div class='line' id='LC456'><br/></div><div class='line' id='LC457'>	<span class="cm">/**</span></div><div class='line' id='LC458'><span class="cm">	 * Adds a new keyboard local not supported by keyboard JS</span></div><div class='line' id='LC459'><span class="cm">	 * @param local</span></div><div class='line' id='LC460'><span class="cm">	 * @param keys</span></div><div class='line' id='LC461'><span class="cm">	 */</span></div><div class='line' id='LC462'>	<span class="kd">function</span> <span class="nx">addLocale</span><span class="p">(</span><span class="nx">local</span><span class="p">,</span> <span class="nx">keys</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC463'>		<span class="nx">locals</span><span class="p">[</span><span class="nx">local</span><span class="p">]</span> <span class="o">=</span> <span class="nx">keys</span><span class="p">;</span></div><div class='line' id='LC464'>	<span class="p">}</span></div><div class='line' id='LC465'><br/></div><div class='line' id='LC466'>	<span class="cm">/**</span></div><div class='line' id='LC467'><span class="cm">	 * Changes the keyboard local</span></div><div class='line' id='LC468'><span class="cm">	 * @param local</span></div><div class='line' id='LC469'><span class="cm">	 */</span></div><div class='line' id='LC470'>	<span class="kd">function</span> <span class="nx">setLocale</span><span class="p">(</span><span class="nx">local</span><span class="p">)</span> <span class="p">{</span></div><div class='line' id='LC471'>		<span class="k">if</span><span class="p">(</span><span class="nx">locals</span><span class="p">[</span><span class="nx">local</span><span class="p">])</span> <span class="p">{</span></div><div class='line' id='LC472'>			<span class="nx">keys</span> <span class="o">=</span> <span class="nx">locals</span><span class="p">[</span><span class="nx">local</span><span class="p">];</span></div><div class='line' id='LC473'>		<span class="p">}</span></div><div class='line' id='LC474'><br/></div><div class='line' id='LC475'>	<span class="p">}</span></div><div class='line' id='LC476'><br/></div><div class='line' id='LC477'>	<span class="k">return</span> <span class="p">{</span></div><div class='line' id='LC478'>		<span class="s2">&quot;bind&quot;</span><span class="o">:</span> <span class="p">{</span></div><div class='line' id='LC479'>			<span class="s2">&quot;key&quot;</span><span class="o">:</span> <span class="nx">bindKey</span><span class="p">,</span></div><div class='line' id='LC480'>			<span class="s2">&quot;axis&quot;</span><span class="o">:</span> <span class="nx">bindAxis</span></div><div class='line' id='LC481'>		<span class="p">},</span></div><div class='line' id='LC482'>		<span class="s2">&quot;activeKeys&quot;</span><span class="o">:</span> <span class="nx">getActiveKeys</span><span class="p">,</span></div><div class='line' id='LC483'>		<span class="s2">&quot;unbind&quot;</span><span class="o">:</span> <span class="p">{</span></div><div class='line' id='LC484'>			<span class="s2">&quot;key&quot;</span><span class="o">:</span> <span class="nx">unbindKey</span></div><div class='line' id='LC485'>		<span class="p">},</span></div><div class='line' id='LC486'>		<span class="s2">&quot;locale&quot;</span><span class="o">:</span> <span class="p">{</span></div><div class='line' id='LC487'>			<span class="s2">&quot;add&quot;</span><span class="o">:</span> <span class="nx">addLocale</span><span class="p">,</span></div><div class='line' id='LC488'>			<span class="s2">&quot;set&quot;</span><span class="o">:</span> <span class="nx">setLocale</span></div><div class='line' id='LC489'>		<span class="p">}</span></div><div class='line' id='LC490'>	<span class="p">}</span></div><div class='line' id='LC491'><span class="p">}));</span></div></pre></div>
          </td>
        </tr>
      </table>
  </div>

          </div>
        </div>
      </div>
    </div>

  </div>

<div class="frame frame-loading large-loading-area" style="display:none;" data-tree-list-url="/RobertWHurst/KeyboardJS/tree-list/25f0f958cdcacd343d19abae7713111fc6f79c1e" data-blob-url-prefix="/RobertWHurst/KeyboardJS/blob/25f0f958cdcacd343d19abae7713111fc6f79c1e">
  <img src="https://a248.e.akamai.net/assets.github.com/images/spinners/octocat-spinner-64.gif?1340935010" height="64" width="64">
</div>

        </div>
      </div>
      <div class="context-overlay"></div>
    </div>

      <div id="footer-push"></div><!-- hack for sticky footer -->
    </div><!-- end of wrapper - hack for sticky footer -->

      <!-- footer -->
      <div id="footer" >
        
  <div class="upper_footer">
     <div class="container clearfix">

       <!--[if IE]><h4 id="blacktocat_ie">GitHub Links</h4><![endif]-->
       <![if !IE]><h4 id="blacktocat">GitHub Links</h4><![endif]>

       <ul class="footer_nav">
         <h4>GitHub</h4>
         <li><a href="https://github.com/about">About</a></li>
         <li><a href="https://github.com/blog">Blog</a></li>
         <li><a href="https://github.com/features">Features</a></li>
         <li><a href="https://github.com/contact">Contact &amp; Support</a></li>
         <li><a href="https://github.com/training">Training</a></li>
         <li><a href="http://enterprise.github.com/">GitHub Enterprise</a></li>
         <li><a href="http://status.github.com/">Site Status</a></li>
       </ul>

       <ul class="footer_nav">
         <h4>Clients</h4>
         <li><a href="http://mac.github.com/">GitHub for Mac</a></li>
         <li><a href="http://windows.github.com/">GitHub for Windows</a></li>
         <li><a href="http://eclipse.github.com/">GitHub for Eclipse</a></li>
         <li><a href="http://mobile.github.com/">GitHub Mobile Apps</a></li>
       </ul>

       <ul class="footer_nav">
         <h4>Tools</h4>
         <li><a href="http://get.gaug.es/">Gauges: Web analytics</a></li>
         <li><a href="http://speakerdeck.com">Speaker Deck: Presentations</a></li>
         <li><a href="https://gist.github.com">Gist: Code snippets</a></li>

         <h4 class="second">Extras</h4>
         <li><a href="http://jobs.github.com/">Job Board</a></li>
         <li><a href="http://shop.github.com/">GitHub Shop</a></li>
         <li><a href="http://octodex.github.com/">The Octodex</a></li>
       </ul>

       <ul class="footer_nav">
         <h4>Documentation</h4>
         <li><a href="http://help.github.com/">GitHub Help</a></li>
         <li><a href="http://developer.github.com/">Developer API</a></li>
         <li><a href="http://github.github.com/github-flavored-markdown/">GitHub Flavored Markdown</a></li>
         <li><a href="http://pages.github.com/">GitHub Pages</a></li>
       </ul>

     </div><!-- /.site -->
  </div><!-- /.upper_footer -->

<div class="lower_footer">
  <div class="container clearfix">
    <!--[if IE]><div id="legal_ie"><![endif]-->
    <![if !IE]><div id="legal"><![endif]>
      <ul>
          <li><a href="https://github.com/site/terms">Terms of Service</a></li>
          <li><a href="https://github.com/site/privacy">Privacy</a></li>
          <li><a href="https://github.com/security">Security</a></li>
      </ul>

      <p>&copy; 2012 <span title="0.08968s from fe19.rs.github.com">GitHub</span> Inc. All rights reserved.</p>
    </div><!-- /#legal or /#legal_ie-->

  </div><!-- /.site -->
</div><!-- /.lower_footer -->

      </div><!-- /#footer -->

    

<div id="keyboard_shortcuts_pane" class="instapaper_ignore readability-extra" style="display:none">
  <h2>Keyboard Shortcuts <small><a href="#" class="js-see-all-keyboard-shortcuts">(see all)</a></small></h2>

  <div class="columns threecols">
    <div class="column first">
      <h3>Site wide shortcuts</h3>
      <dl class="keyboard-mappings">
        <dt>s</dt>
        <dd>Focus site search</dd>
      </dl>
      <dl class="keyboard-mappings">
        <dt>?</dt>
        <dd>Bring up this help dialog</dd>
      </dl>
    </div><!-- /.column.first -->

    <div class="column middle" style='display:none'>
      <h3>Commit list</h3>
      <dl class="keyboard-mappings">
        <dt>j</dt>
        <dd>Move selection down</dd>
      </dl>
      <dl class="keyboard-mappings">
        <dt>k</dt>
        <dd>Move selection up</dd>
      </dl>
      <dl class="keyboard-mappings">
        <dt>c <em>or</em> o <em>or</em> enter</dt>
        <dd>Open commit</dd>
      </dl>
      <dl class="keyboard-mappings">
        <dt>y</dt>
        <dd>Expand URL to its canonical form</dd>
      </dl>
    </div><!-- /.column.first -->

    <div class="column last js-hidden-pane" style='display:none'>
      <h3>Pull request list</h3>
      <dl class="keyboard-mappings">
        <dt>j</dt>
        <dd>Move selection down</dd>
      </dl>
      <dl class="keyboard-mappings">
        <dt>k</dt>
        <dd>Move selection up</dd>
      </dl>
      <dl class="keyboard-mappings">
        <dt>o <em>or</em> enter</dt>
        <dd>Open issue</dd>
      </dl>
      <dl class="keyboard-mappings">
        <dt><span class="platform-mac">⌘</span><span class="platform-other">ctrl</span> <em>+</em> enter</dt>
        <dd>Submit comment</dd>
      </dl>
      <dl class="keyboard-mappings">
        <dt><span class="platform-mac">⌘</span><span class="platform-other">ctrl</span> <em>+</em> shift p</dt>
        <dd>Preview comment</dd>
      </dl>
    </div><!-- /.columns.last -->

  </div><!-- /.columns.equacols -->

  <div class="js-hidden-pane" style='display:none'>
    <div class="rule"></div>

    <h3>Issues</h3>

    <div class="columns threecols">
      <div class="column first">
        <dl class="keyboard-mappings">
          <dt>j</dt>
          <dd>Move selection down</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>k</dt>
          <dd>Move selection up</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>x</dt>
          <dd>Toggle selection</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>o <em>or</em> enter</dt>
          <dd>Open issue</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt><span class="platform-mac">⌘</span><span class="platform-other">ctrl</span> <em>+</em> enter</dt>
          <dd>Submit comment</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt><span class="platform-mac">⌘</span><span class="platform-other">ctrl</span> <em>+</em> shift p</dt>
          <dd>Preview comment</dd>
        </dl>
      </div><!-- /.column.first -->
      <div class="column last">
        <dl class="keyboard-mappings">
          <dt>c</dt>
          <dd>Create issue</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>l</dt>
          <dd>Create label</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>i</dt>
          <dd>Back to inbox</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>u</dt>
          <dd>Back to issues</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>/</dt>
          <dd>Focus issues search</dd>
        </dl>
      </div>
    </div>
  </div>

  <div class="js-hidden-pane" style='display:none'>
    <div class="rule"></div>

    <h3>Issues Dashboard</h3>

    <div class="columns threecols">
      <div class="column first">
        <dl class="keyboard-mappings">
          <dt>j</dt>
          <dd>Move selection down</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>k</dt>
          <dd>Move selection up</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>o <em>or</em> enter</dt>
          <dd>Open issue</dd>
        </dl>
      </div><!-- /.column.first -->
    </div>
  </div>

  <div class="js-hidden-pane" style='display:none'>
    <div class="rule"></div>

    <h3>Network Graph</h3>
    <div class="columns equacols">
      <div class="column first">
        <dl class="keyboard-mappings">
          <dt><span class="badmono">←</span> <em>or</em> h</dt>
          <dd>Scroll left</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt><span class="badmono">→</span> <em>or</em> l</dt>
          <dd>Scroll right</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt><span class="badmono">↑</span> <em>or</em> k</dt>
          <dd>Scroll up</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt><span class="badmono">↓</span> <em>or</em> j</dt>
          <dd>Scroll down</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>t</dt>
          <dd>Toggle visibility of head labels</dd>
        </dl>
      </div><!-- /.column.first -->
      <div class="column last">
        <dl class="keyboard-mappings">
          <dt>shift <span class="badmono">←</span> <em>or</em> shift h</dt>
          <dd>Scroll all the way left</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>shift <span class="badmono">→</span> <em>or</em> shift l</dt>
          <dd>Scroll all the way right</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>shift <span class="badmono">↑</span> <em>or</em> shift k</dt>
          <dd>Scroll all the way up</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>shift <span class="badmono">↓</span> <em>or</em> shift j</dt>
          <dd>Scroll all the way down</dd>
        </dl>
      </div><!-- /.column.last -->
    </div>
  </div>

  <div class="js-hidden-pane" >
    <div class="rule"></div>
    <div class="columns threecols">
      <div class="column first js-hidden-pane" >
        <h3>Source Code Browsing</h3>
        <dl class="keyboard-mappings">
          <dt>t</dt>
          <dd>Activates the file finder</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>l</dt>
          <dd>Jump to line</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>w</dt>
          <dd>Switch branch/tag</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>y</dt>
          <dd>Expand URL to its canonical form</dd>
        </dl>
      </div>
    </div>
  </div>

  <div class="js-hidden-pane" style='display:none'>
    <div class="rule"></div>
    <div class="columns threecols">
      <div class="column first">
        <h3>Browsing Commits</h3>
        <dl class="keyboard-mappings">
          <dt><span class="platform-mac">⌘</span><span class="platform-other">ctrl</span> <em>+</em> enter</dt>
          <dd>Submit comment</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>escape</dt>
          <dd>Close form</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>p</dt>
          <dd>Parent commit</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>o</dt>
          <dd>Other parent commit</dd>
        </dl>
      </div>
    </div>
  </div>

  <div class="js-hidden-pane" style='display:none'>
    <div class="rule"></div>
    <h3>Notifications</h3>

    <div class="columns threecols">
      <div class="column first">
        <dl class="keyboard-mappings">
          <dt>j</dt>
          <dd>Move selection down</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>k</dt>
          <dd>Move selection up</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>o <em>or</em> enter</dt>
          <dd>Open notification</dd>
        </dl>
      </div><!-- /.column.first -->

      <div class="column second">
        <dl class="keyboard-mappings">
          <dt>e <em>or</em> shift i <em>or</em> y</dt>
          <dd>Mark as read</dd>
        </dl>
        <dl class="keyboard-mappings">
          <dt>shift m</dt>
          <dd>Mute thread</dd>
        </dl>
      </div><!-- /.column.first -->
    </div>
  </div>

</div>

    <div id="markdown-help" class="instapaper_ignore readability-extra">
  <h2>Markdown Cheat Sheet</h2>

  <div class="cheatsheet-content">

  <div class="mod">
    <div class="col">
      <h3>Format Text</h3>
      <p>Headers</p>
      <pre>
# This is an &lt;h1&gt; tag
## This is an &lt;h2&gt; tag
###### This is an &lt;h6&gt; tag</pre>
     <p>Text styles</p>
     <pre>
*This text will be italic*
_This will also be italic_
**This text will be bold**
__This will also be bold__

*You **can** combine them*
</pre>
    </div>
    <div class="col">
      <h3>Lists</h3>
      <p>Unordered</p>
      <pre>
* Item 1
* Item 2
  * Item 2a
  * Item 2b</pre>
     <p>Ordered</p>
     <pre>
1. Item 1
2. Item 2
3. Item 3
   * Item 3a
   * Item 3b</pre>
    </div>
    <div class="col">
      <h3>Miscellaneous</h3>
      <p>Images</p>
      <pre>
![GitHub Logo](/images/logo.png)
Format: ![Alt Text](url)
</pre>
     <p>Links</p>
     <pre>
http://github.com - automatic!
[GitHub](http://github.com)</pre>
<p>Blockquotes</p>
     <pre>
As Kanye West said:

> We're living the future so
> the present is our past.
</pre>
    </div>
  </div>
  <div class="rule"></div>

  <h3>Code Examples in Markdown</h3>
  <div class="col">
      <p>Syntax highlighting with <a href="http://github.github.com/github-flavored-markdown/" title="GitHub Flavored Markdown" target="_blank">GFM</a></p>
      <pre>
```javascript
function fancyAlert(arg) {
  if(arg) {
    $.facebox({div:'#foo'})
  }
}
```</pre>
    </div>
    <div class="col">
      <p>Or, indent your code 4 spaces</p>
      <pre>
Here is a Python code example
without syntax highlighting:

    def foo:
      if not bar:
        return true</pre>
    </div>
    <div class="col">
      <p>Inline code for comments</p>
      <pre>
I think you should use an
`&lt;addr&gt;` element here instead.</pre>
    </div>
  </div>

  </div>
</div>


    <div id="ajax-error-message">
      <span class="mini-icon mini-icon-exclamation"></span>
      Something went wrong with that request. Please try again.
      <a href="#" class="ajax-error-dismiss">Dismiss</a>
    </div>

    <div id="logo-popup">
      <h2>Looking for the GitHub logo?</h2>
      <ul>
        <li>
          <h4>GitHub Logo</h4>
          <a href="http://github-media-downloads.s3.amazonaws.com/GitHub_Logos.zip"><img alt="Github_logo" src="https://a248.e.akamai.net/assets.github.com/images/modules/about_page/github_logo.png?1340935010" /></a>
          <a href="http://github-media-downloads.s3.amazonaws.com/GitHub_Logos.zip" class="minibutton btn-download download">Download</a>
        </li>
        <li>
          <h4>The Octocat</h4>
          <a href="http://github-media-downloads.s3.amazonaws.com/Octocats.zip"><img alt="Octocat" src="https://a248.e.akamai.net/assets.github.com/images/modules/about_page/octocat.png?1340935010" /></a>
          <a href="http://github-media-downloads.s3.amazonaws.com/Octocats.zip" class="minibutton btn-download download">Download</a>
        </li>
      </ul>
    </div>

    
    
    <span id='server_response_time' data-time='0.09259' data-host='fe19'></span>
  </body>
</html>

