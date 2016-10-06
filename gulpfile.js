// made on 09/2016 by Edwin Caspers
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const $ = gulpLoadPlugins();
const browserSync = require('browser-sync');
const del = require('del');
const Server = require('karma').Server;
const shell = require('gulp-shell');
const wiredep = require('wiredep').stream;

gulp.task('clean', del.bind(null, ['dist', 'src/styles/index.css']));

gulp.task('styles', () => {
  return gulp.src('src/styles/*.scss')
    .pipe($.plumber())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.replace('/*!', '/*'))
    .pipe($.autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}))
    .pipe(browserSync.reload({stream: true}));
});

gulp.task('sass', function() {
    return gulp.src("src/styles/*.scss")
        .pipe($.sass())
        .pipe(gulp.dest("src/styles"))
        .pipe(browserSync.stream());
});

gulp.task('scripts', () => {
  return gulp.src('src/scripts/*.js')
    .pipe($.plumber())
    .pipe($.babel())
    .pipe($.concat('index.js'))
    .pipe(browserSync.reload({stream: true}));
});

gulp.task('html', ['styles', 'scripts'], () => {
  return gulp.src('src/*.html')
    .pipe($.useref({searchPath: ['src', '.']}))
    .pipe($.if('*.html', $.htmlMinifier({collapseWhitespace: true, keepClosingSlash: true, removeComments: true})))
    .pipe($.if('*.js', $.minify()))
    .pipe($.if('*.css', $.cleanCss({compatibility: 'ie8', debug: true, keepSpecialComments:0})))
    .pipe($.replace('.css">', '.css"></link>'))
    .pipe($.replace('/index.js"', '/index-min.js"'))
    .pipe(gulp.dest('dist'));
});

gulp.task('images', () => {
  return gulp.src('src/images/**/*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [{cleanupIDs: false}]
    })))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('extras', () => {
  return gulp.src([
    'src/*.*',
    '!src/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('wiredep', () => {
  gulp.src('src/styles/*.scss')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('src/styles'));
  gulp.src('src/*.html')
    .pipe(wiredep({
      exclude: ['bootstrap-sass'],
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('src'));
});

function lint(files, options) {
  return gulp.src(files)
    .pipe(browserSync.reload({stream: true, once: true}))
    .pipe($.eslint(options))
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
}
gulp.task('lint', () => {
  return lint('src/scripts/**/*.js', {
      fix: true
    })
    .pipe(gulp.dest('src/scripts'));
});
gulp.task('lint:html', () => {
  //TODO: code to be added for pushing the code to git repository
});
gulp.task('lint:scss', () => {
    return gulp.src('src/styles/**/*.scss')
        .pipe($.sassLint({'config': '.scss.yml'}))
        .pipe($.sassLint.format())
        .pipe($.sassLint.failOnError());
});
gulp.task('lint:js', () => {
    return gulp.src(['src/scripts/**/*.js','test/spec/**/*.js'])
        .pipe($.jshint())
        .pipe($.jscs('.jscs.json'))
        .pipe($.jscsStylish.combineWithHintResults())
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.eslint({configFile: ".eslint.json"}))
        .pipe($.eslint.format())
        .pipe($.eslint.failOnError());
});

gulp.task('test', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done).start();
});
gulp.task('test:internetexplorer', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
    browsers: ['IE']
  }, done).start();
});
gulp.task('test:chrome', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
    browsers: ['Chrome']
  }, done).start();
});
gulp.task('test:firefox', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
    browsers: ['Firefox']
  }, done).start();
});
gulp.task('test:opera', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
    browsers: ['Opera']
  }, done).start();
});
gulp.task('test:safari', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
    browsers: ['Safari']
  }, done).start();
});
gulp.task('test:tdd', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js'
  }, done).start();
});

gulp.task('serve', ['sass','lint:scss', 'scripts', 'lint', 'lint:js', 'test'], () => {
  browserSync({
    notify: false,
    port: 3333,
    server: {
      baseDir: ['src'],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch([
    'src/*.html',
    'src/images/**/*'
  ]).on('change', browserSync.reload);

  gulp.watch('src/styles/**/*.scss', ['sass', 'lint:scss']);
  gulp.watch('src/scripts/**/*.js', ['scripts', 'lint', 'lint:js', 'test']);
  gulp.watch('bower.json', ['wiredep']);
});

gulp.task('serve:dist', () => {
  browserSync({
    notify: false,
    port: 3334,
    server: {
      baseDir: ['dist']
    }
  });
});

gulp.task('builder', ['test', 'test:internetexplorer', 'lint', 'lint:html', 'lint:js', 'lint:scss', 'sass', 'html', 'images', 'extras'], () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('building', ['builder'], del.bind(null, ['dist/$(contextRoot)','dist/scripts/index.js']));

gulp.task('build', ['building'], () => {
    gulp.start('styles');
    gulp.src(['dist/*', '!dist/$(contextRoot)', 'dist/styles/*', 'dist/scripts/*'], { base: './dist' })
        .pipe($.zip('widget.zip'))
        .pipe(gulp.dest('dist'));
});

gulp.task('default', ['clean'], () => {
  gulp.start('build');
});

gulp.task('import', shell.task([
  'gulp default & cd dist & bb import-item & cd ../'
]));

gulp.task('release', ['default'], function(done) {
  //TODO: code to be added for pushing the code to git repository & check for line-coverage of tests is sufficient
});

gulp.task('documentation', function () {
  gulp.src('./src/**/*.js')
    .pipe($.documentation({ format: 'md' }))
    .pipe(gulp.dest('docs'));
});