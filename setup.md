# How to make your commits signed on MacOS

Follow
https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits

Install GPG suite from
https://gpgtools.org/

In GPG suite create a new key and add it for your email (madsbak@outlook.com)
Upload the public key to GPG through gpg suite app, check you can retrive it again
Save the password to the key, you will need that later

Export the public key, and upload it to github

Ensure all commits are signed
```bash
git config --global commit.gpgsign true
```

Set your GPG key on your local machine (key can be short or long)
```bash
git config --global user.signingkey 51EA95F6
```

Make sure to set your git name and email so it matches what's in the GPG key
```bash
git config --global user.name "Mads Bak"
git config --global user.email "madsbak@outlook.com"
```

Then start signing your commits, and check on github if you have the 'verified' status for your commits



